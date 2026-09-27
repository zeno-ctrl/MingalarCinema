import crypto from "node:crypto";

/**
 * Symmetric encryption for sensitive-but-not-hashable secrets (TOTP seeds).
 * Key is derived from NEXTAUTH_SECRET so no extra env var is required, but
 * kept in a distinct derivation so it can't be confused with (or reused as)
 * the NextAuth JWT signing key.
 *
 * LEGACY_SALT must stay forever: it's what already-stored 2FA secrets in
 * production were encrypted with under the app's old "cinetown" name.
 * Changing it without a fallback would make every existing admin's 2FA
 * secret permanently undecryptable and lock them out.
 */
const CURRENT_SALT = "mingalar-cinema-2fa";
const LEGACY_SALT = "cinetown-2fa";

function getKey(salt: string): Buffer {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set");
  return crypto.scryptSync(secret, salt, 32);
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(CURRENT_SALT), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

function decryptWithSalt(payload: string, salt: string): string {
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(salt), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function decryptSecret(payload: string): string {
  try {
    return decryptWithSalt(payload, CURRENT_SALT);
  } catch {
    // Falls back for secrets encrypted before the salt was renamed.
    return decryptWithSalt(payload, LEGACY_SALT);
  }
}

export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

/** Cryptographically-random fixed-width numeric code (e.g. a login code), zero-padded. */
export function generateNumericCode(digits = 6): string {
  const max = 10 ** digits;
  return crypto.randomInt(0, max).toString().padStart(digits, "0");
}
