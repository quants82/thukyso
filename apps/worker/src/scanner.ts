import { createHash, randomUUID } from "node:crypto";
import type { Queue } from "bullmq";
import type Redis from "ioredis";
import { DriveClient, type DriveFile } from "./drive-client.js";
import { ScannerRepository, type ScannableConnection } from "./scanner.repository.js";

const LOCK_TTL_MS = 5 * 60 * 1000;

export class DriveScanner {
  constructor(
    private readonly drive: DriveClient,
    private readonly repository: ScannerRepository,
    private readonly queue: Queue,
    private readonly redis: Redis,
    private readonly prefix: string,
    private readonly maxBytes: number
  ) {}

  async scanAll() {
    const connections = await this.repository.connections();
    for (const connection of connections) {
      await this.withLock(connection.id, () => this.scanConnection(connection));
    }
  }

  private async scanConnection(connection: ScannableConnection) {
    const files = await this.drive.listInboxFiles(
      connection.inboxFolderId,
      connection.refreshToken
    );
    for (const file of files) {
      if (
        !connection.scanExistingFiles &&
        !file.appProperties?.thukysoQueuedAt &&
        file.createdTime &&
        new Date(file.createdTime) < connection.connectedAt
      ) {
        continue;
      }
      await this.scanFile(connection, file).catch((error: unknown) => {
        console.error("Drive file scan failed", {
          connectionId: connection.id,
          driveFileId: file.id,
          error: error instanceof Error ? error.message : String(error)
        });
      });
    }
    await this.repository.scanned(connection.id);
  }

  private async scanFile(connection: ScannableConnection, file: DriveFile) {
    if (!this.drive.isSupported(file)) {
      await this.rejectAndMove(connection, file, "UNSUPPORTED_MIME_TYPE");
      return;
    }
    if (file.size && BigInt(file.size) > BigInt(this.maxBytes)) {
      await this.rejectAndMove(connection, file, "FILE_TOO_LARGE");
      return;
    }
    let sha256: string;
    try {
      sha256 = await this.drive.sha256(file.id, this.maxBytes, connection.refreshToken);
    } catch (error) {
      if (error instanceof Error && error.message === "FILE_TOO_LARGE") {
        await this.rejectAndMove(connection, file, "FILE_TOO_LARGE");
        return;
      }
      throw error;
    }
    const registered = await this.repository.register(connection, file, sha256);
    const jobId = createHash("sha256").update(registered.job.jobKey).digest("hex");
    await this.queue.add("analyze-document", registered.payload, { jobId });
    await this.drive.moveFile(
      file.id,
      connection.inboxFolderId,
      connection.processingFolderId,
      connection.refreshToken
    );
  }

  private async rejectAndMove(
    connection: ScannableConnection,
    file: DriveFile,
    code: string
  ) {
    await this.repository.reject(connection, file, code);
    await this.drive.moveFile(
      file.id,
      connection.inboxFolderId,
      connection.errorFolderId,
      connection.refreshToken
    );
  }

  private async withLock(connectionId: string, action: () => Promise<void>) {
    const key = `${this.prefix}:lock:scan:${connectionId}`;
    const token = randomUUID();
    const acquired = await this.redis.set(key, token, "PX", LOCK_TTL_MS, "NX");
    if (acquired !== "OK") return;
    try {
      await action();
    } finally {
      await this.redis.eval(
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
        1,
        key,
        token
      );
    }
  }
}
