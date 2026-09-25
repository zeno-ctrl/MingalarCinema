import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatMMK(amount: number): string {
  return new Intl.NumberFormat("en-US").format(amount) + " Ks";
}

export function generateBookingReference(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let ref = "MC-";
  for (let i = 0; i < 8; i++) {
    ref += chars[Math.floor(Math.random() * chars.length)];
    if (i === 3) ref += "-";
  }
  return ref;
}

export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  // Falls back to a short random slug for non-Latin-script input (e.g. a
  // movie title entered entirely in Burmese), which strips to nothing above.
  return slug || `n-${Math.random().toString(36).slice(2, 8)}`;
}

/** Normalizes an email for lookup/storage: trims, Unicode-NFKC normalizes,
 * then lowercases. Mitigates homoglyph/normalization-order bypass issues
 * in upstream auth libraries by ensuring we always compare a canonical form. */
export function normalizeEmail(email: string): string {
  return email.normalize("NFKC").trim().toLowerCase();
}
