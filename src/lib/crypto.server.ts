// Server-only AES-256-GCM helpers for encrypting sensitive numbers
// (phone numbers, IBANs, etc.) at rest. Key is loaded from APP_AES_KEY env
// (64 hex chars = 32 bytes). Never import this file from client code.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function getKey(): Buffer {
  const hex = process.env.APP_AES_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("APP_AES_KEY missing or invalid (need 64 hex chars / 32 bytes)");
  }
  return Buffer.from(hex, "hex");
}

/** Returns base64( iv(12) | tag(16) | ciphertext ). */
export function encryptSecret(plain: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64");
}

export function decryptSecret(packed: string): string {
  const key = getKey();
  const raw = Buffer.from(packed, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const ct = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

/** Mask all but the last `keep` characters of a string with •. */
export function maskTail(s: string, keep = 4): string {
  if (s.length <= keep) return "•".repeat(s.length);
  return "•".repeat(s.length - keep) + s.slice(-keep);
}
