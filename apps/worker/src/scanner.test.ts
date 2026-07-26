import { describe, expect, it, vi } from "vitest";
import { DriveScanner } from "./scanner.js";

const connection = {
  id: "connection-1",
  organizationId: "organization-1",
  inboxFolderId: "inbox",
  processingFolderId: "processing",
  errorFolderId: "errors",
  connectedAt: new Date("2026-07-27T00:00:00Z"),
  scanExistingFiles: false
};

function redisStub() {
  return {
    set: vi.fn().mockResolvedValue("OK"),
    eval: vi.fn().mockResolvedValue(1)
  };
}

describe("DriveScanner", () => {
  it("registers, enqueues and moves a supported file with a deterministic job ID", async () => {
    const file = {
      id: "file-1",
      name: "van-ban.pdf",
      mimeType: "application/pdf",
      size: "100",
      createdTime: "2026-07-27T01:00:00Z"
    };
    const drive = {
      listInboxFiles: vi.fn().mockResolvedValue([file]),
      isSupported: vi.fn().mockReturnValue(true),
      sha256: vi.fn().mockResolvedValue("a".repeat(64)),
      moveFile: vi.fn()
    };
    const repository = {
      connections: vi.fn().mockResolvedValue([connection]),
      register: vi.fn().mockResolvedValue({
        job: { jobKey: "analyze:connection-1:file-1:hash" },
        payload: { documentId: "document-1" }
      }),
      scanned: vi.fn()
    };
    const queue = { add: vi.fn() };
    const scanner = new DriveScanner(
      drive as never,
      repository as never,
      queue as never,
      redisStub() as never,
      "thukyso",
      1_000
    );

    await scanner.scanAll();

    expect(repository.register).toHaveBeenCalledWith(connection, file, "a".repeat(64));
    expect(queue.add).toHaveBeenCalledWith(
      "analyze-document",
      { documentId: "document-1" },
      { jobId: expect.stringMatching(/^[a-f0-9]{64}$/) }
    );
    expect(drive.moveFile).toHaveBeenCalledWith("file-1", "inbox", "processing");
    expect(repository.scanned).toHaveBeenCalledWith("connection-1");
  });

  it("rejects unsupported files and moves them to the error folder", async () => {
    const file = {
      id: "file-2",
      name: "image.png",
      mimeType: "image/png",
      createdTime: "2026-07-27T01:00:00Z"
    };
    const drive = {
      listInboxFiles: vi.fn().mockResolvedValue([file]),
      isSupported: vi.fn().mockReturnValue(false),
      moveFile: vi.fn()
    };
    const repository = {
      connections: vi.fn().mockResolvedValue([connection]),
      reject: vi.fn(),
      scanned: vi.fn()
    };
    const queue = { add: vi.fn() };
    const scanner = new DriveScanner(
      drive as never,
      repository as never,
      queue as never,
      redisStub() as never,
      "thukyso",
      1_000
    );

    await scanner.scanAll();

    expect(repository.reject).toHaveBeenCalledWith(
      connection,
      file,
      "UNSUPPORTED_MIME_TYPE"
    );
    expect(drive.moveFile).toHaveBeenCalledWith("file-2", "inbox", "errors");
    expect(queue.add).not.toHaveBeenCalled();
  });

  it("skips files older than the connection when scanExistingFiles is false", async () => {
    const drive = {
      listInboxFiles: vi.fn().mockResolvedValue([
        {
          id: "old",
          name: "old.pdf",
          mimeType: "application/pdf",
          createdTime: "2026-07-26T23:59:59Z"
        }
      ]),
      isSupported: vi.fn()
    };
    const repository = {
      connections: vi.fn().mockResolvedValue([connection]),
      scanned: vi.fn()
    };
    const queue = { add: vi.fn() };
    const scanner = new DriveScanner(
      drive as never,
      repository as never,
      queue as never,
      redisStub() as never,
      "thukyso",
      1_000
    );

    await scanner.scanAll();

    expect(drive.isSupported).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });
});
