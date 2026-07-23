import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma.service.js";
import { GOOGLE_PROVIDER, LOGIN_SCOPES } from "./auth.constants.js";
import type { AuthenticatedUser, GoogleIdentity, RequestMetadata } from "./auth.types.js";

interface RefreshTokenFields {
  encryptedRefreshToken: string;
  tokenIv: string;
  tokenAuthTag: string;
}

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertGoogleUser(
    identity: GoogleIdentity,
    encryptedToken: RefreshTokenFields | undefined
  ): Promise<AuthenticatedUser> {
    return this.prisma.$transaction(async (transaction) => {
      const existingAccount = await transaction.oauthAccount.findUnique({
        where: {
          provider_providerAccountId: {
            provider: GOOGLE_PROVIDER,
            providerAccountId: identity.subject
          }
        },
        include: { user: true }
      });

      const user = existingAccount
        ? await transaction.user.update({
            where: { id: existingAccount.userId },
            data: {
              email: identity.email,
              displayName: identity.displayName,
              avatarUrl: identity.avatarUrl
            }
          })
        : await transaction.user.upsert({
            where: { email: identity.email },
            update: {
              displayName: identity.displayName,
              avatarUrl: identity.avatarUrl
            },
            create: {
              email: identity.email,
              displayName: identity.displayName,
              avatarUrl: identity.avatarUrl
            }
          });

      const tokenData = encryptedToken ?? {};
      await transaction.oauthAccount.upsert({
        where: {
          provider_providerAccountId: {
            provider: GOOGLE_PROVIDER,
            providerAccountId: identity.subject
          }
        },
        update: {
          userId: user.id,
          scopes: [...LOGIN_SCOPES],
          expiresAt: identity.expiresAt,
          ...tokenData
        },
        create: {
          userId: user.id,
          provider: GOOGLE_PROVIDER,
          providerAccountId: identity.subject,
          scopes: [...LOGIN_SCOPES],
          expiresAt: identity.expiresAt,
          ...tokenData
        }
      });
      return user;
    });
  }

  async createSession(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    metadata: RequestMetadata
  ) {
    await this.prisma.$transaction([
      this.prisma.userSession.create({
        data: {
          userId,
          tokenHash,
          expiresAt,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent
        }
      }),
      this.auditQuery("AUTH_LOGIN", userId, metadata)
    ]);
  }

  async findActiveSession(tokenHash: string) {
    return this.prisma.userSession.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() }
      },
      include: { user: true }
    });
  }

  async rotateSession(
    sessionId: string,
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    metadata: RequestMetadata
  ) {
    await this.prisma.$transaction([
      this.prisma.userSession.update({
        where: { id: sessionId },
        data: { revokedAt: new Date() }
      }),
      this.prisma.userSession.create({
        data: {
          userId,
          tokenHash,
          expiresAt,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent
        }
      }),
      this.auditQuery("AUTH_SESSION_REFRESH", userId, metadata)
    ]);
  }

  async revokeSession(tokenHash: string, metadata: RequestMetadata) {
    const session = await this.prisma.userSession.findUnique({ where: { tokenHash } });
    if (!session || session.revokedAt) return;
    await this.prisma.$transaction([
      this.prisma.userSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() }
      }),
      this.auditQuery("AUTH_LOGOUT", session.userId, metadata)
    ]);
  }

  private auditQuery(
    action: string,
    actorUserId: string,
    metadata: RequestMetadata
  ): Prisma.PrismaPromise<unknown> {
    return this.prisma.auditLog.create({
      data: {
        actorUserId,
        action,
        entityType: "UserSession",
        requestId: metadata.requestId,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent
      }
    });
  }
}
