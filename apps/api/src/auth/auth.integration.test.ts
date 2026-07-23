import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { requestIdMiddleware } from "../request-id.middleware.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { GoogleOauthService } from "./google-oauth.service.js";
import { OauthStateService } from "./oauth-state.service.js";

describe("auth API", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  async function createApp() {
    const authService = {
      currentUser: vi.fn().mockResolvedValue({
        id: "user-1",
        email: "user@example.com",
        displayName: "User",
        avatarUrl: null
      }),
      refresh: vi.fn().mockResolvedValue({
        token: "replacement-token",
        expiresAt: new Date("2030-01-01T00:00:00.000Z")
      }),
      logout: vi.fn().mockResolvedValue(undefined)
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        {
          provide: GoogleOauthService,
          useValue: { createAuthorizationUrl: vi.fn().mockReturnValue("https://accounts.google.test") }
        },
        {
          provide: OauthStateService,
          useValue: {
            create: vi.fn().mockReturnValue({
              state: "state",
              nonce: "nonce",
              cookieValue: "signed-state"
            })
          }
        }
      ]
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.use(requestIdMiddleware);
    await app.init();
    return authService;
  }

  it("starts Google OAuth using an HttpOnly state cookie", async () => {
    await createApp();
    const response = await request(app!.getHttpServer()).get("/api/v1/auth/google").expect(302);
    expect(response.headers.location).toBe("https://accounts.google.test");
    expect(response.headers["set-cookie"]?.[0]).toContain("HttpOnly");
  });

  it("returns the current user without exposing Google tokens", async () => {
    await createApp();
    await request(app!.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Cookie", "thukyso_session=session-token")
      .expect(200)
      .expect({
        id: "user-1",
        email: "user@example.com",
        displayName: "User",
        avatarUrl: null
      });
  });

  it("rotates and clears session cookies", async () => {
    const authService = await createApp();
    const refreshResponse = await request(app!.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set("Cookie", "thukyso_session=old-token")
      .expect(200);
    expect(refreshResponse.headers["set-cookie"]?.[0]).toContain("replacement-token");

    const logoutResponse = await request(app!.getHttpServer())
      .post("/api/v1/auth/logout")
      .set("Cookie", "thukyso_session=replacement-token")
      .expect(204);
    expect(logoutResponse.headers["set-cookie"]?.[0]).toContain("Max-Age=0");
    expect(authService.logout).toHaveBeenCalledOnce();
  });
});
