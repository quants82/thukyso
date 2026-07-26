import { createHash } from "node:crypto";
import { GoogleAuth } from "google-auth-library";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
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
  private readonly auth: GoogleAuth;

  constructor(keyFile: string) {
    this.auth = new GoogleAuth({ keyFile, scopes: [DRIVE_SCOPE] });
  }

  async listInboxFiles(folderId: string) {
    const files: DriveFile[] = [];
    let pageToken: string | undefined;
    do {
      const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
      const tokenQuery = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "";
      const page = await this.request<{ files?: DriveFile[]; nextPageToken?: string }>(
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

  async sha256(fileId: string, maxBytes: number) {
    const response = await this.fetch(`/files/${encodeURIComponent(fileId)}?alt=media`);
    const declaredSize = Number(response.headers.get("content-length") ?? 0);
    if (declaredSize > maxBytes) throw new Error("FILE_TOO_LARGE");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > maxBytes) throw new Error("FILE_TOO_LARGE");
    return createHash("sha256").update(bytes).digest("hex");
  }

  async moveFile(fileId: string, fromFolderId: string, toFolderId: string) {
    await this.request(
      `/files/${encodeURIComponent(fileId)}?addParents=${encodeURIComponent(toFolderId)}&removeParents=${encodeURIComponent(fromFolderId)}&fields=id,parents&supportsAllDrives=true`,
      { method: "PATCH", body: "{}" }
    );
  }

  private async request<T = unknown>(path: string, init: RequestInit = {}) {
    const response = await this.fetch(path, init);
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  private async fetch(path: string, init: RequestInit = {}) {
    const client = await this.auth.getClient();
    const token = await client.getAccessToken();
    if (!token.token) throw new Error("Không thể tạo Service Account access token");
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
