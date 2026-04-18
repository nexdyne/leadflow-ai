import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-fallback-secret';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '15m';

export function generateAccessToken(userId, email) {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export function generateRefreshToken() {
  return crypto.randomBytes(40).toString('hex');
}

export function getRefreshTokenExpiry() {
  const days = parseInt(process.env.REFRESH_TOKEN_EXPIRY || '7');
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  return expiry;
}
