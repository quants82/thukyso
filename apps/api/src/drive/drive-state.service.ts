import { Injectable, UnauthorizedException } from "@nestjs/common";
import { loadApiEnvironment } from "@thukyso/config";
import { randomToken, signValue, signaturesMatch } from "../auth/token-crypto.js";

interface DriveStatePayload {
  state: string;
  userId: string;
  issuedAt: number;
}

const STATE_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class DriveStateService {
  private readonly secret = loadApiEnvironment().COOKIE_SECRET;

  create(userId: string) {
    const payload: DriveStatePayload = { state: randomToken(), userId, issuedAt: Date.now() };
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return {
      ...payload,
      cookieValue: `${encoded}.${signValue(encoded, this.secret)}`
    };
  }

  verify(cookieValue: string | undefined, returnedState: string | undefined) {
    if (!cookieValue || !returnedState) throw new UnauthorizedException("Drive OAuth state bị thiếu");
    const [encoded, signature, extra] = cookieValue.split(".");
    if (
      !encoded ||
      !signature ||
      extra ||
      !signaturesMatch(signature, signValue(encoded, this.secret))
    ) {
      throw new UnauthorizedException("Drive OAuth state không hợp lệ");
    }
    let payload: DriveStatePayload;
    try {
      payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    } catch {
      throw new UnauthorizedException("Drive OAuth state không hợp lệ");
    }
    if (
      payload.state !== returnedState ||
      !payload.userId ||
      Date.now() - payload.issuedAt > STATE_TTL_MS
    ) {
      throw new UnauthorizedException("Drive OAuth state đã hết hạn hoặc không khớp");
    }
    return payload;
  }
}
