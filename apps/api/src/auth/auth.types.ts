export interface GoogleIdentity {
  subject: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface RequestMetadata {
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}
