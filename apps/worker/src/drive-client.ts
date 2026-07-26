import { createHash } from "node:crypto";
import { OAuth2Client } from "google-auth-library";

const PDF_MIME = "application/pdf";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  appProperties?: Record<string, string>;
}

export class DriveClient {
  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string
  ) {}

  async listInboxFiles(folderId: string, refreshToken: string) {
    const files: DriveFile[] = [];
    let pageToken: string | undefined;
    do {
      const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
      const tokenQuery = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "";
      const page = await this.request<{ files?: DriveFile[]; nextPageToken?: string }>(
        refreshToken,
        `/files?q=${query}&fields=nextPageToken,files(id,name,mimeType,size,createdTime,modifiedTime,appProperties)&pageSize=100&orderBy=createdTime${tokenQuery}`
      );
      files.push(...(page.files ?? []));
      pageToken = page.nextPageToken;
    } while (pageToken);
    return files;
  }

  isSupported(file: DriveFile) {
    return file.mimeType === PDF_MIME || file.mimeType === DOCX_MIME;
  }

  async sha256(fileId: string, maxBytes: number, refreshToken: string) {
    const bytes = await this.download(fileId, maxBytes, refreshToken);
    return createHash("sha256").update(bytes).digest("hex");
  }

  async download(fileId: string, maxBytes: number, refreshToken: string) {
    const response = await this.fetch(
      refreshToken,
      `/files/${encodeURIComponent(fileId)}?alt=media`
    );
    const declaredSize = Number(response.headers.get("content-length") ?? 0);
    if (declaredSize > maxBytes) throw new Error("FILE_TOO_LARGE");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > maxBytes) throw new Error("FILE_TOO_LARGE");
    return bytes;
  }

  async moveFile(
    fileId: string,
    fromFolderId: string,
    toFolderId: string,
    refreshToken: string
  ) {
    await this.request(
      refreshToken,
      `/files/${encodeURIComponent(fileId)}?addParents=${encodeURIComponent(toFolderId)}&removeParents=${encodeURIComponent(fromFolderId)}&fields=id,parents&supportsAllDrives=true`,
      { method: "PATCH", body: "{}" }
    );
  }

  private async request<T = unknown>(
    refreshToken: string,
    path: string,
    init: RequestInit = {}
  ) {
    const response = await this.fetch(refreshToken, path, init);
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  private async fetch(refreshToken: string, path: string, init: RequestInit = {}) {
    const client = new OAuth2Client(this.clientId, this.clientSecret);
    client.setCredentials({ refresh_token: refreshToken });
    const token = await client.getAccessToken();
    if (!token.token) throw new Error("Không thể tạo OAuth Drive access token");
    const response = await fetch(`https://www.googleapis.com/drive/v3${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${token.token}`,
        "content-type": "application/json",
        ...init.headers
      }
    });
    if (!response.ok) {
      throw new Error(`Google Drive API lỗi ${response.status}: ${(await response.text()).slice(0, 500)}`);
    }
    return response;
  }
}
