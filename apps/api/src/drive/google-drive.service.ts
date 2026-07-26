import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { loadApiEnvironment } from "@thukyso/config";
import { OAuth2Client } from "google-auth-library";
import { DRIVE_FOLDER_MIME_TYPE, DRIVE_SCOPE } from "./drive.constants.js";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  capabilities?: { canAddChildren?: boolean; canShare?: boolean };
}

const PROCESSABLE_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
] as const;

@Injectable()
export class GoogleDriveService {
  private readonly environment = loadApiEnvironment();
  private readonly oauth = new OAuth2Client(
    this.environment.GOOGLE_CLIENT_ID,
    this.environment.GOOGLE_CLIENT_SECRET,
    this.environment.GOOGLE_DRIVE_CALLBACK_URL
  );

  authorizationUrl(state: string) {
    return this.oauth.generateAuthUrl({
      access_type: "offline",
      include_granted_scopes: true,
      prompt: "consent",
      scope: [DRIVE_SCOPE],
      state
    });
  }

  async exchangeCode(code: string) {
    const { tokens } = await this.oauth.getToken(code);
    if (!tokens.refresh_token) {
      throw new UnauthorizedException("Google không trả về Drive refresh token");
    }
    return {
      refreshToken: tokens.refresh_token,
      scopes: tokens.scope?.split(" ").filter(Boolean) ?? [DRIVE_SCOPE]
    };
  }

  async pickerToken(refreshToken: string) {
    const client = this.client(refreshToken);
    const token = await client.getAccessToken();
    if (!token.token) throw new UnauthorizedException("Không thể tạo Google Picker access token");
    return {
      accessToken: token.token,
      apiKey: this.environment.GOOGLE_PICKER_API_KEY,
      appId: this.environment.GOOGLE_CLOUD_PROJECT_NUMBER
    };
  }

  async getFolder(refreshToken: string, folderId: string) {
    const folder = await this.request<DriveFile>(
      refreshToken,
      `/files/${encodeURIComponent(folderId)}?fields=id,name,mimeType,capabilities(canAddChildren,canShare)&supportsAllDrives=true`
    );
    if (folder.mimeType !== DRIVE_FOLDER_MIME_TYPE) {
      throw new BadRequestException("Mục đã chọn không phải thư mục Google Drive");
    }
    if (!folder.capabilities?.canAddChildren || !folder.capabilities.canShare) {
      throw new BadRequestException("Thư mục cần quyền thêm nội dung và chia sẻ");
    }
    return folder;
  }

  async ensureFolder(refreshToken: string, parentId: string, name: string) {
    const escapedName = name.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
    const query = encodeURIComponent(
      `'${parentId}' in parents and name = '${escapedName}' and mimeType = '${DRIVE_FOLDER_MIME_TYPE}' and trashed = false`
    );
    const existing = await this.request<{ files: DriveFile[] }>(
      refreshToken,
      `/files?q=${query}&fields=files(id,name,mimeType)&pageSize=1&supportsAllDrives=true&includeItemsFromAllDrives=true`
    );
    if (existing.files[0]) return existing.files[0];
    return this.request<DriveFile>(refreshToken, "/files?fields=id,name,mimeType&supportsAllDrives=true", {
      method: "POST",
      body: JSON.stringify({ name, mimeType: DRIVE_FOLDER_MIME_TYPE, parents: [parentId] })
    });
  }

  async shareWithServiceAccount(refreshToken: string, folderId: string) {
    return this.request<{ id: string }>(
      refreshToken,
      `/files/${encodeURIComponent(folderId)}/permissions?fields=id&supportsAllDrives=true&sendNotificationEmail=false`,
      {
        method: "POST",
        body: JSON.stringify({
          type: "user",
          role: "writer",
          emailAddress: this.environment.GOOGLE_SERVICE_ACCOUNT_EMAIL
        })
      }
    );
  }

  async prepareFileForInbox(refreshToken: string, fileId: string, inboxFolderId: string) {
    const file = await this.request<DriveFile>(
      refreshToken,
      `/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,parents,capabilities(canShare)&supportsAllDrives=true`
    );
    if (!PROCESSABLE_MIME_TYPES.includes(file.mimeType as (typeof PROCESSABLE_MIME_TYPES)[number])) {
      throw new BadRequestException("Chỉ chấp nhận PDF hoặc DOCX");
    }
    if (!file.capabilities?.canShare) {
      throw new BadRequestException("File cần quyền chia sẻ cho worker");
    }
    const removeParents = (file.parents ?? [])
      .filter((parentId) => parentId !== inboxFolderId)
      .join(",");
    const parentQuery = removeParents
      ? `&removeParents=${encodeURIComponent(removeParents)}`
      : "";
    await this.request(
      refreshToken,
      `/files/${encodeURIComponent(file.id)}?addParents=${encodeURIComponent(inboxFolderId)}${parentQuery}&fields=id,parents,appProperties&supportsAllDrives=true`,
      {
        method: "PATCH",
        body: JSON.stringify({
          appProperties: { thukysoQueuedAt: new Date().toISOString() }
        })
      }
    );
    return { id: file.id, name: file.name, mimeType: file.mimeType };
  }

  async removePermission(refreshToken: string, folderId: string, permissionId: string) {
    await this.request(
      refreshToken,
      `/files/${encodeURIComponent(folderId)}/permissions/${encodeURIComponent(permissionId)}?supportsAllDrives=true`,
      { method: "DELETE" }
    );
  }

  private client(refreshToken: string) {
    const client = new OAuth2Client(
      this.environment.GOOGLE_CLIENT_ID,
      this.environment.GOOGLE_CLIENT_SECRET,
      this.environment.GOOGLE_DRIVE_CALLBACK_URL
    );
    client.setCredentials({ refresh_token: refreshToken });
    return client;
  }

  private async request<T = unknown>(refreshToken: string, path: string, init: RequestInit = {}) {
    const client = this.client(refreshToken);
    const token = await client.getAccessToken();
    if (!token.token) throw new UnauthorizedException("Google Drive token không hợp lệ");
    const response = await fetch(`https://www.googleapis.com/drive/v3${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${token.token}`,
        "content-type": "application/json",
        ...init.headers
      }
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new BadGatewayException(`Google Drive API lỗi ${response.status}: ${detail}`);
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }
}
