/**
 * AES-256-GCM field-level encryption for sensitive tax data (SSN, EIN, etc).
 *
 * Requires TAX_ENCRYPTION_KEY env var — a 64-char hex string (32 bytes).
 * Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Stored format: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 *
 * IMPORTANT: Decrypted values must NEVER be returned in any API response.
 * They are only ever used internally (e.g. 1099 CSV export sent directly to file).
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

function getKey(): Buffer {
  const hex = process.env["TAX_ENCRYPTION_KEY"];
  if (!hex || hex.length !== 64) {
    throw new Error("TAX_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  }
  return Buffer.from(hex, "hex");
}

export function encryptField(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptField(stored: string): string {
  const key = getKey();
  const parts = stored.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted field format");
  const [ivHex, authTagHex, encHex] = parts;
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivHex!, "hex"),
  );
  decipher.setAuthTag(Buffer.from(authTagHex!, "hex"));
  return (
    decipher.update(Buffer.from(encHex!, "hex")).toString("utf8") +
    decipher.final("utf8")
  );
}

/**
 * Returns true if TAX_ENCRYPTION_KEY is configured.
 * Use to fail gracefully at startup rather than at first request.
 */
export function isEncryptionConfigured(): boolean {
  const hex = process.env["TAX_ENCRYPTION_KEY"];
  return !!(hex && hex.length === 64);
}
