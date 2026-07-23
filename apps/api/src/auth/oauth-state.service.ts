import { Injectable, UnauthorizedException } from "@nestjs/common";
import { loadApiEnvironment } from "@thukyso/config";
import { randomToken, signValue, signaturesMatch } from "./token-crypto.js";

interface StatePayload {
  state: string;
  nonce: string;
  issuedAt: number;
}

const STATE_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class OauthStateService {
  private readonly secret = loadApiEnvironment().COOKIE_SECRET;

  create() {
    const payload: StatePayload = {
      state: randomToken(),
      nonce: randomToken(),
      issuedAt: Date.now()
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return {
      ...payload,
      cookieValue: `${encoded}.${signValue(encoded, this.secret)}`
    };
  }

  verify(cookieValue: string | undefined, returnedState: string | undefined): StatePayload {
    if (!cookieValue || !returnedState) {
      throw new UnauthorizedException("OAuth state bị thiếu");
    }
    const [encoded, signature, extra] = cookieValue.split(".");
    if (!encoded || !signature || extra || !signaturesMatch(signature, signValue(encoded, this.secret))) {
      throw new UnauthorizedException("OAuth state không hợp lệ");
    }

    let payload: StatePayload;
    try {
      payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as StatePayload;
    } catch {
      throw new UnauthorizedException("OAuth state không hợp lệ");
    }

    if (
      payload.state !== returnedState ||
      !payload.nonce ||
      !Number.isFinite(payload.issuedAt) ||
      Date.now() - payload.issuedAt > STATE_TTL_MS
    ) {
      throw new UnauthorizedException("OAuth state đã hết hạn hoặc không khớp");
    }
    return payload;
  }
}
