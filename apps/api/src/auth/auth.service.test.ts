import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AuthRepository } from "./auth.repository.js";
import { AuthService } from "./auth.service.js";

function repositoryStub() {
  return {
    upsertGoogleUser: vi.fn().mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      displayName: "User",
      avatarUrl: null
    }),
    createSession: vi.fn().mockResolvedValue(undefined),
    findActiveSession: vi.fn(),
    rotateSession: vi.fn().mockResolvedValue(undefined),
    revokeSession: vi.fn().mockResolvedValue(undefined)
  };
}

describe("AuthService", () => {
  it("stores an encrypted Google refresh token and a hashed session token", async () => {
    const repository = repositoryStub();
    const service = new AuthService(repository as unknown as AuthRepository);
    const result = await service.finishGoogleLogin(
      {
        subject: "google-sub",
        email: "user@example.com",
        refreshToken: "plain-refresh-token"
      },
      {}
    );

    const encryptedFields = repository.upsertGoogleUser.mock.calls[0]?.[1];
    expect(encryptedFields.encryptedRefreshToken).not.toContain("plain-refresh-token");
    expect(repository.createSession.mock.calls[0]?.[1]).toMatch(/^[a-f0-9]{64}$/);
    expect(result.token).not.toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects missing sessions", async () => {
    const service = new AuthService(repositoryStub() as unknown as AuthRepository);
    await expect(service.currentUser(undefined)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rotates an active session", async () => {
    const repository = repositoryStub();
    repository.findActiveSession.mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      user: {
        id: "user-1",
        email: "user@example.com",
        displayName: null,
        avatarUrl: null
      }
    });
    const service = new AuthService(repository as unknown as AuthRepository);
    const replacement = await service.refresh("old-token", {});
    expect(replacement.token).toBeTruthy();
    expect(repository.rotateSession).toHaveBeenCalledOnce();
  });
});
