import crypto from 'crypto';
import { query } from '../db/connection.js';
import { hashPassword } from './hash.js';

/**
 * bootstrapPlatformAdmin — one-shot platform admin password initializer.
 *
 * Runs at server startup (from server.js) IFF env var BOOTSTRAP_PLATFORM_ADMIN=1.
 *
 * Flow David uses on Railway:
 *   1. First deploy creates admin@nexdynegroup.com + support@nexdynegroup.com
 *      with a disabled password hash (migration 027).
 *   2. David adds BOOTSTRAP_PLATFORM_ADMIN=1 in Railway variables and Redeploys.
 *   3. On boot this helper detects the disabled hash, generates a random
 *      24-character password, bcrypts it, updates the row, and prints:
 *
 *        ======================================================================
 *         PLATFORM ADMIN PASSWORD BOOTSTRAPPED
 *         email:    admin@nexdynegroup.com
 *         password: XXXXXXXXXXXXXXXXXXXXXXXX
 *
 *         Log in, you will be forced to change this password on first use.
 *         REMOVE the BOOTSTRAP_PLATFORM_ADMIN env var after capturing this.
 *        ======================================================================
 *
 *   4. David copies the password from the Railway deploy log, logs in, is
 *      forced to change it, then removes the env var.
 *
 * Idempotency: if BOOTSTRAP_PLATFORM_ADMIN=1 is left set across redeploys,
 * it will only regenerate a password for rows that STILL have the
 * '!DISABLED!' placeholder. Rows with a real bcrypt hash are skipped —
 * so re-running won't overwrite an active password.
 *
 * Safe-by-default: without the env var, this does absolutely nothing.
 */

const ACCOUNTS = [
  { email: 'admin@nexdynegroup.com',   label: 'primary' },
  { email: 'support@nexdynegroup.com', label: 'backup'  },
];

function strongPassword(len = 24) {
  // Avoid ambiguous chars (0/O, 1/l/I) so a human reading a log can copy correctly.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function banner(lines) {
  const bar = '='.repeat(74);
  // eslint-disable-next-line no-console
  console.log('\n' + bar);
  for (const line of lines) console.log(' ' + line);
  console.log(bar + '\n');
}

export async function bootstrapPlatformAdmin() {
  if (process.env.BOOTSTRAP_PLATFORM_ADMIN !== '1') return;

  console.log('[bootstrap] BOOTSTRAP_PLATFORM_ADMIN=1 — checking platform admin accounts…');

  for (const acct of ACCOUNTS) {
    try {
      const row = await query(
        `SELECT id, password_hash FROM users WHERE email = $1`,
        [acct.email]
      );
      if (row.rows.length === 0) {
        console.warn(`[bootstrap] skip ${acct.email} — row not found (migration 027 may not have run yet)`);
        continue;
      }
      const currentHash = row.rows[0].password_hash;
      if (currentHash && currentHash !== '!DISABLED!' && currentHash.startsWith('$2')) {
        // Already has a real bcrypt hash — don't clobber.
        console.log(`[bootstrap] skip ${acct.email} — password already set (${acct.label})`);
        continue;
      }

      const pw = strongPassword(24);
      const hash = await hashPassword(pw);
      await query(
        `UPDATE users
         SET password_hash = $1,
             must_change_password = true,
             updated_at = NOW()
         WHERE email = $2`,
        [hash, acct.email]
      );

      banner([
        `PLATFORM ADMIN PASSWORD BOOTSTRAPPED (${acct.label})`,
        `  email:    ${acct.email}`,
        `  password: ${pw}`,
        '',
        '  Log in at https://abatecomply.com — you will be forced to',
        '  change this password on first login.',
        '',
        '  REMOVE the BOOTSTRAP_PLATFORM_ADMIN env var in Railway once',
        '  you have captured this password, then Redeploy.',
      ]);
    } catch (err) {
      console.error(`[bootstrap] failed for ${acct.email}:`, err.message);
    }
  }
}
