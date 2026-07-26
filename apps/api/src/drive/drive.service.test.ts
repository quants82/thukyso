import "../test-env.js";
import { describe, expect, it, vi } from "vitest";
import { DriveService } from "./drive.service.js";

describe("DriveService", () => {
  it("stores an encrypted incremental Drive grant", async () => {
    const repository = {
      saveGrant: vi.fn()
    };
    const google = {
      exchangeCode: vi.fn().mockResolvedValue({
        refreshToken: "refresh-token",
        scopes: ["https://www.googleapis.com/auth/drive.file"]
      })
    };
    const service = new DriveService(repository as never, google as never);

    await service.finishAuthorization("user-1", "code");

    expect(repository.saveGrant).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        encryptedRefreshToken: expect.not.stringContaining("refresh-token"),
        tokenIv: expect.any(String),
        tokenAuthTag: expect.any(String)
      }),
      ["https://www.googleapis.com/auth/drive.file"]
    );
  });

  it("creates the standard folder structure once a folder is selected", async () => {
    const repository = {
      findGoogleAccount: vi.fn().mockResolvedValue({
        encryptedRefreshToken: "kctK8N48Wz1sD0R6Sw",
        tokenIv: "AAECAwQFBgcICQoL",
        tokenAuthTag: "LQVnY3Wf5-fnV7cPRGZ8Lg",
        scopes: ["https://www.googleapis.com/auth/drive.file"]
      }),
      activeConnection: vi.fn().mockResolvedValue(null),
      saveConnection: vi.fn().mockImplementation((value) => value)
    };
    const google = {
      getFolder: vi.fn().mockResolvedValue({
        id: "selected",
        name: "Tai lieu",
        mimeType: "application/vnd.google-apps.folder"
      }),
      shareWithServiceAccount: vi.fn().mockResolvedValue({ id: "permission" }),
      ensureFolder: vi.fn().mockImplementation((_token, parentId, name) =>
        Promise.resolve({ id: `${parentId}-${name}`, name })
      )
    };
    const service = new DriveService(repository as never, google as never);
    Reflect.set(service, "refreshToken", vi.fn().mockResolvedValue("refresh-token"));

    const result = await service.connectFolder(
      { id: "user-1", email: "user@example.com" },
      { folderId: "selected" },
      {}
    );

    expect(google.ensureFolder).toHaveBeenCalledTimes(10);
    expect(repository.saveConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedFolderId: "selected",
        permissionId: "permission",
        folders: expect.arrayContaining([
          expect.objectContaining({ folderType: "INBOX", name: "00_VAN_BAN_MOI" }),
          expect.objectContaining({ folderType: "ERROR", name: "99_LOI_XU_LY" })
        ])
      })
    );
    expect(result.folders).toHaveLength(9);
  });
});
