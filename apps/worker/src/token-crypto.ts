import { createDecipheriv } from "node:crypto";

export function decryptRefreshToken(
  value: { ciphertext: string; iv: string; authTag: string },
  hexKey: string
) {
  const key = Buffer.from(hexKey, "hex");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(value.iv, "base64url")
  );
  decipher.setAuthTag(Buffer.from(value.authTag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(value.ciphertext, "base64url")),
    decipher.final()
  ]).toString("utf8");
}
