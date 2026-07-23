import { describe, expect, it } from "vitest";
import {
  decryptAes256Gcm,
  encryptAes256Gcm,
  hashToken,
  randomToken
} from "./token-crypto.js";

const KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("token crypto", () => {
  it("encrypts refresh tokens with authenticated AES-256-GCM", () => {
    const encrypted = encryptAes256Gcm("google-refresh-token", KEY);
    expect(encrypted.ciphertext).not.toContain("google-refresh-token");
    expect(decryptAes256Gcm(encrypted, KEY)).toBe("google-refresh-token");
  });

  it("creates opaque session tokens and stores only stable hashes", () => {
    const token = randomToken();
    expect(token).toHaveLength(43);
    expect(hashToken(token)).toMatch(/^[a-f0-9]{64}$/);
  });
});
