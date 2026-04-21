import crypto from 'crypto';

/**
 * generateTempPassword — create a cryptographically strong temporary password
 * suitable for being read off a Railway log line or an email and typed
 * into a login form once.
 *
 * Uses an "unambiguous" alphabet:
 *   - no 0 / O (zero vs capital O)
 *   - no 1 / l / I (one vs lowercase L vs capital i)
 *   - a curated set of symbols that are safe to copy/paste and survive
 *     being rendered inside HTML email (no < > & " ')
 *
 * Default length 16 gives ~ log2(62 ^ 16) ≈ 95 bits of entropy, well above
 * what's useful for an email-delivered one-shot password.
 */
export function generateTempPassword(len = 16) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*+=';
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}
