import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { loadApiEnvironment } from "@thukyso/config";
import { AuthRepository } from "./auth.repository.js";
import type { GoogleIdentity, RequestMetadata } from "./auth.types.js";
import { encryptAes256Gcm, hashToken, randomToken } from "./token-crypto.js";

@Injectable()
export class AuthService {
  private readonly environment = loadApiEnvironment();

  constructor(@Inject(AuthRepository) private readonly repository: AuthRepository) {}

  async finishGoogleLogin(identity: GoogleIdentity, metadata: RequestMetadata) {
    const encryptedToken = identity.refreshToken
      ? (() => {
          const encrypted = encryptAes256Gcm(
            identity.refreshToken,
            this.environment.TOKEN_ENCRYPTION_KEY
          );
          return {
            encryptedRefreshToken: encrypted.ciphertext,
            tokenIv: encrypted.iv,
            tokenAuthTag: encrypted.authTag
          };
        })()
      : undefined;
    const user = await this.repository.upsertGoogleUser(identity, encryptedToken);
    const session = this.newSession();
    await this.repository.createSession(user.id, hashToken(session.token), session.expiresAt, metadata);
    return session;
  }

  async currentUser(token: string | undefined) {
    const session = await this.activeSession(token);
    return {
      id: session.user.id,
      email: session.user.email,
      displayName: session.user.displayName,
      avatarUrl: session.user.avatarUrl
    };
  }

  async refresh(token: string | undefined, metadata: RequestMetadata) {
    const session = await this.activeSession(token);
    const replacement = this.newSession();
    await this.repository.rotateSession(
      session.id,
      session.userId,
      hashToken(replacement.token),
      replacement.expiresAt,
      metadata
    );
    return replacement;
  }

  async logout(token: string | undefined, metadata: RequestMetadata) {
    if (token) {
      await this.repository.revokeSession(hashToken(token), metadata);
    }
  }

  private async activeSession(token: string | undefined) {
    if (!token) throw new UnauthorizedException("Chưa đăng nhập");
    const session = await this.repository.findActiveSession(hashToken(token));
    if (!session) throw new UnauthorizedException("Phiên đăng nhập không hợp lệ hoặc đã hết hạn");
    return session;
  }

  private newSession() {
    const token = randomToken();
    const expiresAt = new Date(
      Date.now() + this.environment.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000
    );
    return { token, expiresAt };
  }
}
