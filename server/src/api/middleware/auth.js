import { verifyAccessToken } from '../../utils/jwt.js';
import { query } from '../../db/connection.js';

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required', code: 'NO_TOKEN' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);
    req.user = { userId: decoded.userId, email: decoded.email };

    // C61: gate on the full lifecycle, not just suspended_at. A user
    // with a valid, unexpired access token but a row flagged as
    // deactivated or active=false (e.g., recently deactivated by a
    // platform admin) must not be able to continue acting until their
    // token expires. Returns the most specific reason available so the
    // frontend can distinguish "suspended" from "deactivated" on the
    // login page when the token is refreshed.
    //
    // Fail-open on DB outage is preserved (matches CS21) — locking
    // everyone out during a DB blip is worse than the narrow window
    // where a suspended token briefly works.
    query(
      'SELECT active, suspended_at, deactivated_at FROM users WHERE id = $1',
      [decoded.userId]
    )
      .then(result => {
        if (result.rows.length === 0) {
          return res.status(403).json({ error: 'Account not found', code: 'ACCOUNT_NOT_FOUND' });
        }
        const u = result.rows[0];
        if (u.deactivated_at) {
          return res.status(403).json({ error: 'Account deactivated', code: 'ACCOUNT_DEACTIVATED' });
        }
        if (u.suspended_at) {
          return res.status(403).json({ error: 'Account suspended', code: 'ACCOUNT_SUSPENDED' });
        }
        if (u.active === false) {
          return res.status(403).json({ error: 'Account inactive', code: 'ACCOUNT_INACTIVE' });
        }
        next();
      })
      .catch(err => {
        console.error('Lifecycle check failed:', err.message);
        // Fail open — if DB is unreachable, let the request through rather than locking everyone out.
        next();
      });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
  }
}
