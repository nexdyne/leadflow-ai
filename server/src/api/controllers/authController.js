import crypto from 'crypto';
import { query } from '../../db/connection.js';
import { hashPassword, verifyPassword } from '../../utils/hash.js';
import { generateAccessToken, generateRefreshToken, getRefreshTokenExpiry } from '../../utils/jwt.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordResetConfirmEmail,
  sendEmailVerifiedConfirmEmail,
} from '../../utils/email.js';

// Generate a 64-char hex token (fits VARCHAR(128))
function makeToken() {
  return crypto.randomBytes(32).toString('hex');
}

export async function register(req, res) {
  const { email, password, fullName, companyName } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required', code: 'VALIDATION_ERROR' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters', code: 'VALIDATION_ERROR' });
  }

  // Check if email already exists
  const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: 'An account with this email already exists', code: 'EMAIL_EXISTS' });
  }

  const passwordHash = await hashPassword(password);
  const verificationToken = makeToken();
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const result = await query(
    `INSERT INTO users (email, password_hash, full_name, company_name,
                        email_verified, email_verification_token, email_verification_expires)
     VALUES ($1, $2, $3, $4, false, $5, $6)
     RETURNING id, email, full_name, company_name, created_at`,
    [
      email.toLowerCase(),
      passwordHash,
      fullName || null,
      companyName || null,
      verificationToken,
      verificationExpires,
    ]
  );

  const user = result.rows[0];
  const token = generateAccessToken(user.id, user.email);
  const refreshToken = generateRefreshToken();

  await query(
    'INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES ($1, $2, $3)',
    [user.id, refreshToken, getRefreshTokenExpiry()]
  );

  // Fire-and-forget verification email — do not block registration on email delivery
  sendVerificationEmail(user.email, verificationToken).catch((err) => {
    console.error('[register] sendVerificationEmail failed:', err?.message || err);
  });

  res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      companyName: user.company_name,
    },
    token,
    refreshToken,
  });
}

export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required', code: 'VALIDATION_ERROR' });
  }

  const result = await query(
    'SELECT id, email, password_hash, full_name, company_name FROM users WHERE email = $1 AND active = true',
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({ error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' });
  }

  const user = result.rows[0];
  const valid = await verifyPassword(password, user.password_hash);

  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' });
  }

  const token = generateAccessToken(user.id, user.email);
  const refreshToken = generateRefreshToken();

  await query(
    'INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES ($1, $2, $3)',
    [user.id, refreshToken, getRefreshTokenExpiry()]
  );

  res.json({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      companyName: user.company_name,
    },
    token,
    refreshToken,
  });
}

export async function refresh(req, res) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required', code: 'VALIDATION_ERROR' });
  }

  const result = await query(
    `SELECT s.id, s.user_id, u.email FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.refresh_token = $1 AND s.is_revoked = false AND s.expires_at > NOW()`,
    [refreshToken]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({ error: 'Invalid or expired refresh token', code: 'INVALID_REFRESH' });
  }

  const session = result.rows[0];

  // Revoke old token (rotation)
  await query('UPDATE sessions SET is_revoked = true WHERE id = $1', [session.id]);

  // Issue new tokens
  const newToken = generateAccessToken(session.user_id, session.email);
  const newRefreshToken = generateRefreshToken();

  await query(
    'INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES ($1, $2, $3)',
    [session.user_id, newRefreshToken, getRefreshTokenExpiry()]
  );

  res.json({ token: newToken, refreshToken: newRefreshToken });
}

export async function logout(req, res) {
  const { refreshToken } = req.body;

  if (refreshToken) {
    await query('UPDATE sessions SET is_revoked = true WHERE refresh_token = $1', [refreshToken]);
  }

  res.json({ success: true });
}

export async function getProfile(req, res) {
  const result = await query(
    'SELECT id, email, full_name, company_name, phone, license_number, created_at FROM users WHERE id = $1',
    [req.user.userId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
  }

  const u = result.rows[0];
  res.json({
    id: u.id,
    email: u.email,
    fullName: u.full_name,
    companyName: u.company_name,
    phone: u.phone,
    licenseNumber: u.license_number,
    createdAt: u.created_at,
  });
}

// ---------------------------------------------------------------------------
// Password reset + email verification
// ---------------------------------------------------------------------------

/**
 * POST /auth/forgot-password
 * Always returns 200 to avoid revealing whether an email is registered.
 */
export async function forgotPassword(req, res) {
  const { email } = req.body || {};

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required', code: 'VALIDATION_ERROR' });
  }

  const safeMessage =
    'If an account with that email exists, a reset link has been sent. Check your inbox (and spam folder).';

  try {
    const result = await query(
      'SELECT id, email FROM users WHERE email = $1 AND active = true',
      [email.trim().toLowerCase()]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      const token = makeToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Invalidate any prior unused tokens for this user
      await query(
        `UPDATE password_reset_tokens
         SET used_at = NOW()
         WHERE user_id = $1 AND used_at IS NULL`,
        [user.id]
      );

      await query(
        `INSERT INTO password_reset_tokens (user_id, token, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, token, expiresAt]
      );

      try {
        await sendPasswordResetEmail(user.email, token);
      } catch (err) {
        console.error('[forgotPassword] sendPasswordResetEmail failed:', err?.message || err);
      }
    }

    return res.json({ message: safeMessage });
  } catch (err) {
    console.error('[forgotPassword] unexpected error:', err?.message || err);
    // Still return a generic success to avoid leaking account existence
    return res.json({ message: safeMessage });
  }
}

/**
 * POST /auth/reset-password
 * Body: { token, password }
 */
export async function resetPassword(req, res) {
  const { token, password } = req.body || {};

  if (!token || !password) {
    return res.status(400).json({ error: 'Token and new password are required', code: 'VALIDATION_ERROR' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters', code: 'VALIDATION_ERROR' });
  }

  const tokenResult = await query(
    `SELECT t.id, t.user_id, t.expires_at, t.used_at,
            u.email, u.full_name
     FROM password_reset_tokens t
     JOIN users u ON u.id = t.user_id
     WHERE t.token = $1`,
    [token]
  );

  if (tokenResult.rows.length === 0) {
    return res.status(400).json({ error: 'Invalid or expired reset link', code: 'INVALID_TOKEN' });
  }

  const row = tokenResult.rows[0];

  if (row.used_at) {
    return res.status(400).json({ error: 'This reset link has already been used', code: 'TOKEN_USED' });
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return res.status(400).json({ error: 'This reset link has expired. Please request a new one.', code: 'TOKEN_EXPIRED' });
  }

  const passwordHash = await hashPassword(password);

  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, row.user_id]);
  await query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [row.id]);

  // Revoke all active sessions for this user — force sign-in everywhere
  await query(
    'UPDATE sessions SET is_revoked = true WHERE user_id = $1 AND is_revoked = false',
    [row.user_id]
  );

  try {
    await sendPasswordResetConfirmEmail(row.email, row.full_name);
  } catch (err) {
    console.error('[resetPassword] sendPasswordResetConfirmEmail failed:', err?.message || err);
  }

  return res.json({ success: true, message: 'Password reset successfully' });
}

/**
 * POST /auth/verify-email
 * Body: { token }
 */
export async function verifyEmail(req, res) {
  const { token } = req.body || {};

  if (!token) {
    return res.status(400).json({ error: 'Verification token is required', code: 'VALIDATION_ERROR' });
  }

  const result = await query(
    `SELECT id, email, full_name, email_verified, email_verification_expires
     FROM users
     WHERE email_verification_token = $1`,
    [token]
  );

  if (result.rows.length === 0) {
    return res.status(400).json({ error: 'Invalid verification link', code: 'INVALID_TOKEN' });
  }

  const user = result.rows[0];

  if (user.email_verified) {
    // Idempotent: treat as success so repeated clicks don't error
    return res.json({ success: true, message: 'Email already verified' });
  }

  if (
    user.email_verification_expires &&
    new Date(user.email_verification_expires).getTime() < Date.now()
  ) {
    return res.status(400).json({
      error: 'This verification link has expired. Please request a new one.',
      code: 'TOKEN_EXPIRED',
    });
  }

  await query(
    `UPDATE users
     SET email_verified = true,
         email_verification_token = NULL,
         email_verification_expires = NULL
     WHERE id = $1`,
    [user.id]
  );

  try {
    await sendEmailVerifiedConfirmEmail(user.email, user.full_name);
  } catch (err) {
    console.error('[verifyEmail] sendEmailVerifiedConfirmEmail failed:', err?.message || err);
  }

  return res.json({ success: true, message: 'Email verified successfully' });
}
