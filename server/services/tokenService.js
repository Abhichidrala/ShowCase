const jwt = require('jsonwebtoken');
const { dbRun, dbGet } = require('../config/db');

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'access-secret-fallback-123456';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret-fallback-78910';

const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d';  // 7 days

const TokenService = {
  generateAccessToken(user) {
    return jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
  },

  generateRefreshToken(user) {
    return jwt.sign(
      { id: user.id, username: user.username },
      REFRESH_TOKEN_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );
  },

  verifyAccessToken(token) {
    try {
      return jwt.verify(token, ACCESS_TOKEN_SECRET);
    } catch (e) {
      return null;
    }
  },

  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, REFRESH_TOKEN_SECRET);
    } catch (e) {
      return null;
    }
  },

  async saveRefreshToken(userId, token, userAgent, ipAddress) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await dbRun(
      `INSERT INTO sessions (user_id, refresh_token, user_agent, ip_address, expires_at) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId, token, userAgent, ipAddress, expiresAt]
    );
  },

  async revokeRefreshToken(token) {
    await dbRun('UPDATE sessions SET is_revoked = 1 WHERE refresh_token = ?', [token]);
  },

  async isRefreshTokenValid(token) {
    const session = await dbGet('SELECT * FROM sessions WHERE refresh_token = ?', [token]);
    if (!session || session.is_revoked === 1) return false;
    
    const expiryDate = new Date(session.expires_at);
    if (expiryDate < new Date()) return false;
    
    return true;
  }
};

module.exports = TokenService;
