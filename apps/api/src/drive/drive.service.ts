import { BadRequestException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { loadApiEnvironment } from "@thukyso/config";
import type { RequestMetadata } from "../auth/auth.types.js";
import { decryptAes256Gcm, encryptAes256Gcm } from "../auth/token-crypto.js";
import { STANDARD_FOLDERS } from "./drive.constants.js";
import { DriveRepository } from "./drive.repository.js";
import { GoogleDriveService } from "./google-drive.service.js";

@Injectable()
export class DriveService {
  private readonly environment = loadApiEnvironment();

  constructor(
    @Inject(DriveRepository) private readonly repository: DriveRepository,
    @Inject(GoogleDriveService) private readonly google: GoogleDriveService
  ) {}

  authorizationUrl(state: string) {
    return this.google.authorizationUrl(state);
  }

  async finishAuthorization(userId: string, code: string) {
    const grant = await this.google.exchangeCode(code);
    const encrypted = encryptAes256Gcm(
      grant.refreshToken,
      this.environment.TOKEN_ENCRYPTION_KEY
    );
    await this.repository.saveGrant(
      userId,
      {
        encryptedRefreshToken: encrypted.ciphertext,
        tokenIv: encrypted.iv,
        tokenAuthTag: encrypted.authTag
      },
      grant.scopes
    );
  }

  async pickerConfiguration(userId: string) {
    return this.google.pickerToken(await this.refreshToken(userId));
  }

  async connection(userId: string) {
    const connection = await this.repository.activeConnection(userId);
    if (!connection) return null;
    return {
      id: connection.id,
      status: connection.status,
      selectedFolderId: connection.selectedFolderId,
      selectedFolderName: connection.selectedFolderName,
      rootFolderId: connection.rootFolderId,
      scanExistingFiles: connection.scanExistingFiles,
      connectedAt: connection.connectedAt,
      folders: connection.folders.map((folder) => ({
        type: folder.folderType,
        id: folder.driveFolderId,
        name: folder.name
      }))
    };
  }

  async connectFolder(
    user: { id: string; email: string },
    input: { folderId?: string; scanExistingFiles?: boolean },
    metadata: RequestMetadata
  ) {
    const folderId = input.folderId?.trim();
    if (!folderId || folderId.length > 200) {
      throw new BadRequestException("folderId không hợp lệ");
    }
    const refreshToken = await this.refreshToken(user.id);
    const selectedFolder = await this.google.getFolder(refreshToken, folderId);
    const previous = await this.repository.activeConnection(user.id);
    const reusedPermission =
      previous?.selectedFolderId === selectedFolder.id
        ? previous.serviceAccountPermissionId
        : undefined;
    const permissionId =
      reusedPermission ??
      (await this.google.shareWithServiceAccount(refreshToken, selectedFolder.id)).id;
    let connection;
    try {
      const root = await this.google.ensureFolder(refreshToken, selectedFolder.id, "THU_KY_SO");
      const folders = [];
      for (const [folderType, name] of STANDARD_FOLDERS) {
        const folder = await this.google.ensureFolder(refreshToken, root.id, name);
        folders.push({ folderType, name, driveFolderId: folder.id });
      }
      connection = await this.repository.saveConnection({
        userId: user.id,
        googleAccountEmail: user.email,
        selectedFolderId: selectedFolder.id,
        selectedFolderName: selectedFolder.name,
        rootFolderId: root.id,
        permissionId,
        scanExistingFiles: input.scanExistingFiles === true,
        folders,
        metadata
      });
    } catch (error) {
      if (!reusedPermission) {
        await this.google
          .removePermission(refreshToken, selectedFolder.id, permissionId)
          .catch(() => undefined);
      }
      throw error;
    }
    if (
      previous?.selectedFolderId &&
      previous.serviceAccountPermissionId &&
      previous.selectedFolderId !== selectedFolder.id
    ) {
      await this.google
        .removePermission(
          refreshToken,
          previous.selectedFolderId,
          previous.serviceAccountPermissionId
        )
        .catch(() => undefined);
    }
    return connection;
  }

  async disconnect(userId: string, metadata: RequestMetadata) {
    const connection = await this.repository.activeConnection(userId);
    if (!connection) return;
    const refreshToken = await this.refreshToken(userId);
    if (connection.selectedFolderId && connection.serviceAccountPermissionId) {
      await this.google.removePermission(
        refreshToken,
        connection.selectedFolderId,
        connection.serviceAccountPermissionId
      );
    }
    await this.repository.disconnect(connection.id, userId, metadata);
  }

  private async refreshToken(userId: string) {
    const account = await this.repository.findGoogleAccount(userId);
    if (
      !account?.encryptedRefreshToken ||
      !account.tokenIv ||
      !account.tokenAuthTag ||
      !account.scopes.includes("https://www.googleapis.com/auth/drive.file")
    ) {
      throw new UnauthorizedException("Cần cấp quyền Google Drive");
    }
    return decryptAes256Gcm(
      {
        ciphertext: account.encryptedRefreshToken,
        iv: account.tokenIv,
        authTag: account.tokenAuthTag
      },
      this.environment.TOKEN_ENCRYPTION_KEY
    );
  }
}
