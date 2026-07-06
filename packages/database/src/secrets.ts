import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";

/**
 * Encrypts an OAuth token / API key before it is written to
 * secrets_metadata.encrypted_value. Never store plaintext secrets in Postgres,
 * even behind RLS — RLS protects row visibility, not what's inside the row.
 */
export function encryptSecret(plaintext: string, base64Key: string): string {
  const key = Buffer.from(base64Key, "base64").subarray(0, 32);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptSecret(ciphertext: string, base64Key: string): string {
  const [ivB64, tagB64, dataB64] = ciphertext.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Malformed secret ciphertext");
  }
  const key = Buffer.from(base64Key, "base64").subarray(0, 32);
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
  return decrypted.toString("utf8");
}
