import { createCipheriv, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptRefreshToken } from "./token-crypto.js";

describe("decryptRefreshToken", () => {
  it("decrypts the AES-256-GCM format stored by the API", () => {
    const key = randomBytes(32);
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const ciphertext = Buffer.concat([cipher.update("refresh-token"), cipher.final()]);

    expect(
      decryptRefreshToken(
        {
          ciphertext: ciphertext.toString("base64url"),
          iv: iv.toString("base64url"),
          authTag: cipher.getAuthTag().toString("base64url")
        },
        key.toString("hex")
      )
    ).toBe("refresh-token");
  });
});
