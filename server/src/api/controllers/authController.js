import { query } from '../../db/connection.js';
import { hashPassword, verifyPassword } from '../../utils/hash.js';
import { generateAccessToken, generateRefreshToken, getRefreshTokenExpiry } from '../../utils/jwt.js';

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

  const result = await query(
    `INSERT INTO users (email, password_hash, full_name, company_name)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, full_name, company_name, created_at`,
    [email.toLowerCase(), passwordHash, fullName || null, companyName || null]
  );

  const user = result.rows[0];
  const token = generateAccessToken(user.id, user.email);
  const refreshToken = generateRefreshToken();

  await query(
    'INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES ($1, $2, $3)',
    [user.id, refreshToken, getRefreshTokenExpiry()]
  );

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
