import { PrismaClient, type Prisma } from "@prisma/client";
import type { DriveFile } from "./drive-client.js";

export interface ScannableConnection {
  id: string;
  organizationId: string;
  inboxFolderId: string;
  processingFolderId: string;
  errorFolderId: string;
  connectedAt: Date;
  scanExistingFiles: boolean;
}

export class ScannerRepository {
  constructor(readonly prisma = new PrismaClient()) {}

  async connections(): Promise<ScannableConnection[]> {
    const connections = await this.prisma.driveConnection.findMany({
      where: {
        status: "ACTIVE",
        inboxFolderId: { not: null },
        processingFolderId: { not: null }
      },
      select: {
        id: true,
        organizationId: true,
        inboxFolderId: true,
        processingFolderId: true,
        connectedAt: true,
        scanExistingFiles: true,
        folders: {
          where: { folderType: "ERROR" },
          select: { driveFolderId: true },
          take: 1
        }
      }
    });
    return connections
      .filter((connection) => connection.folders[0])
      .map(({ folders, ...connection }) => ({
        ...connection,
        errorFolderId: folders[0]!.driveFolderId
      })) as ScannableConnection[];
  }

  async register(
    connection: ScannableConnection,
    file: DriveFile,
    sha256: string
  ) {
    const jobKey = `analyze:${connection.id}:${file.id}:${sha256}`;
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.document.findUnique({
        where: {
          driveConnectionId_driveFileId: {
            driveConnectionId: connection.id,
            driveFileId: file.id
          }
        }
      });
      const document = await tx.document.upsert({
        where: {
          driveConnectionId_driveFileId: {
            driveConnectionId: connection.id,
            driveFileId: file.id
          }
        },
        update: {
          name: file.name,
          mimeType: file.mimeType,
          sizeBytes: file.size ? BigInt(file.size) : undefined,
          sha256,
          status: "QUEUED",
          errorCode: null,
          errorMessage: null
        },
        create: {
          organizationId: connection.organizationId,
          driveConnectionId: connection.id,
          driveFileId: file.id,
          name: file.name,
          mimeType: file.mimeType,
          sizeBytes: file.size ? BigInt(file.size) : undefined,
          sha256,
          status: "QUEUED"
        }
      });
      await tx.documentVersion.upsert({
        where: { documentId_sha256: { documentId: document.id, sha256 } },
        update: {
          driveFileId: file.id,
          modifiedTime: file.modifiedTime ? new Date(file.modifiedTime) : undefined
        },
        create: {
          documentId: document.id,
          driveFileId: file.id,
          sha256,
          modifiedTime: file.modifiedTime ? new Date(file.modifiedTime) : undefined
        }
      });
      const payload: Prisma.InputJsonObject = {
        documentId: document.id,
        driveConnectionId: connection.id,
        driveFileId: file.id,
        sha256
      };
      const job = await tx.job.upsert({
        where: { jobKey },
        update: { payload },
        create: {
          organizationId: connection.organizationId,
          documentId: document.id,
          queue: "documents",
          jobKey,
          payload
        }
      });
      if (!existing) {
        await tx.auditLog.create({
          data: {
            organizationId: connection.organizationId,
            action: "DOCUMENT_DISCOVERED",
            entityType: "Document",
            entityId: document.id,
            metadata: { driveFileId: file.id, mimeType: file.mimeType, sha256 }
          }
        });
      }
      return { document, job, payload };
    });
  }

  async reject(connection: ScannableConnection, file: DriveFile, code: string) {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.document.findUnique({
        where: {
          driveConnectionId_driveFileId: {
            driveConnectionId: connection.id,
            driveFileId: file.id
          }
        }
      });
      const document = await tx.document.upsert({
        where: {
          driveConnectionId_driveFileId: {
            driveConnectionId: connection.id,
            driveFileId: file.id
          }
        },
        update: { status: "FAILED", errorCode: code, errorMessage: code },
        create: {
          organizationId: connection.organizationId,
          driveConnectionId: connection.id,
          driveFileId: file.id,
          name: file.name,
          mimeType: file.mimeType,
          sizeBytes: file.size ? BigInt(file.size) : undefined,
          status: "FAILED",
          errorCode: code,
          errorMessage: code
        }
      });
      if (!existing || existing.errorCode !== code) {
        await tx.auditLog.create({
          data: {
            organizationId: connection.organizationId,
            action: "DOCUMENT_REJECTED",
            entityType: "Document",
            entityId: document.id,
            metadata: { code, driveFileId: file.id }
          }
        });
      }
    });
  }

  scanned(connectionId: string) {
    return this.prisma.driveConnection.update({
      where: { id: connectionId },
      data: { lastScannedAt: new Date() }
    });
  }

  close() {
    return this.prisma.$disconnect();
  }
}
