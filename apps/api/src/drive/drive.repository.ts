import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service.js";
import type { RequestMetadata } from "../auth/auth.types.js";

interface TokenFields {
  encryptedRefreshToken: string;
  tokenIv: string;
  tokenAuthTag: string;
}

interface FolderRecord {
  folderType: string;
  name: string;
  driveFolderId: string;
}

@Injectable()
export class DriveRepository {
  constructor(private readonly prisma: PrismaService) {}

  findGoogleAccount(userId: string) {
    return this.prisma.oauthAccount.findFirst({ where: { userId, provider: "google" } });
  }

  async saveGrant(userId: string, token: TokenFields, scopes: string[]) {
    await this.prisma.oauthAccount.updateMany({
      where: { userId, provider: "google" },
      data: { ...token, scopes }
    });
  }

  async activeConnection(userId: string) {
    return this.prisma.driveConnection.findFirst({
      where: { userId, status: "ACTIVE" },
      include: { folders: true },
      orderBy: { connectedAt: "desc" }
    });
  }

  async saveConnection(input: {
    userId: string;
    googleAccountEmail: string;
    selectedFolderId: string;
    selectedFolderName: string;
    rootFolderId: string;
    permissionId: string;
    scanExistingFiles: boolean;
    folders: FolderRecord[];
    metadata: RequestMetadata;
  }) {
    return this.prisma.$transaction(async (tx) => {
      let membership = await tx.membership.findFirst({
        where: { userId: input.userId },
        orderBy: { createdAt: "asc" }
      });
      if (!membership) {
        const organization = await tx.organization.create({
          data: {
            name: "Không gian Thư Ký Số",
            memberships: { create: { userId: input.userId, role: "OWNER" } }
          },
          include: { memberships: true }
        });
        membership = organization.memberships[0]!;
      }
      await tx.driveConnection.updateMany({
        where: { userId: input.userId, status: "ACTIVE" },
        data: { status: "DISCONNECTED", disconnectedAt: new Date() }
      });
      const byType = Object.fromEntries(input.folders.map((folder) => [folder.folderType, folder]));
      const connection = await tx.driveConnection.create({
        data: {
          userId: input.userId,
          organizationId: membership.organizationId,
          googleAccountEmail: input.googleAccountEmail,
          selectedFolderId: input.selectedFolderId,
          selectedFolderName: input.selectedFolderName,
          rootFolderId: input.rootFolderId,
          inboxFolderId: byType.INBOX?.driveFolderId,
          processingFolderId: byType.PROCESSING?.driveFolderId,
          reviewFolderId: byType.REVIEW?.driveFolderId,
          reportsFolderId: byType.DRAFT_REPORTS?.driveFolderId,
          archiveFolderId: byType.ARCHIVE?.driveFolderId,
          serviceAccountPermissionId: input.permissionId,
          scanExistingFiles: input.scanExistingFiles,
          folders: { create: input.folders }
        },
        include: { folders: true }
      });
      await tx.auditLog.create({
        data: {
          organizationId: membership.organizationId,
          actorUserId: input.userId,
          action: "DRIVE_CONNECTED",
          entityType: "DriveConnection",
          entityId: connection.id,
          requestId: input.metadata.requestId,
          ipAddress: input.metadata.ipAddress,
          userAgent: input.metadata.userAgent,
          metadata: { selectedFolderId: input.selectedFolderId }
        }
      });
      return connection;
    });
  }

  async disconnect(connectionId: string, userId: string, metadata: RequestMetadata) {
    return this.prisma.$transaction(async (tx) => {
      const connection = await tx.driveConnection.update({
        where: { id: connectionId, userId },
        data: { status: "DISCONNECTED", disconnectedAt: new Date() }
      });
      await tx.auditLog.create({
        data: {
          organizationId: connection.organizationId,
          actorUserId: userId,
          action: "DRIVE_DISCONNECTED",
          entityType: "DriveConnection",
          entityId: connection.id,
          requestId: metadata.requestId,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent
        }
      });
      return connection;
    });
  }
}
