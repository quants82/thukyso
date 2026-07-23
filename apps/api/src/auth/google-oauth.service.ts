import { Injectable, UnauthorizedException } from "@nestjs/common";
import { loadApiEnvironment } from "@thukyso/config";
import { OAuth2Client } from "google-auth-library";
import { LOGIN_SCOPES } from "./auth.constants.js";
import type { GoogleIdentity } from "./auth.types.js";

@Injectable()
export class GoogleOauthService {
  private readonly environment = loadApiEnvironment();
  private readonly client = new OAuth2Client(
    this.environment.GOOGLE_CLIENT_ID,
    this.environment.GOOGLE_CLIENT_SECRET,
    this.environment.GOOGLE_CALLBACK_URL
  );

  createAuthorizationUrl(state: string, nonce: string) {
    return this.client.generateAuthUrl({
      access_type: "offline",
      include_granted_scopes: true,
      scope: [...LOGIN_SCOPES],
      state,
      nonce
    });
  }

  async exchangeCode(code: string, expectedNonce: string): Promise<GoogleIdentity> {
    const { tokens } = await this.client.getToken(code);
    if (!tokens.id_token) {
      throw new UnauthorizedException("Google không trả về ID token");
    }
    const ticket = await this.client.verifyIdToken({
      idToken: tokens.id_token,
      audience: this.environment.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    if (
      !payload?.sub ||
      !payload.email ||
      payload.email_verified !== true ||
      payload.nonce !== expectedNonce
    ) {
      throw new UnauthorizedException("Danh tính Google không hợp lệ");
    }

    return {
      subject: payload.sub,
      email: payload.email.toLowerCase(),
      displayName: payload.name,
      avatarUrl: payload.picture,
      refreshToken: tokens.refresh_token ?? undefined,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined
    };
  }
}
