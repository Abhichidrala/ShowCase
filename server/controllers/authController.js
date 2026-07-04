const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { dbGet, dbRun } = require('../config/db');
const TokenService = require('../services/tokenService');
const EmailService = require('../services/emailService');
const { generateSecret, verifyTOTP } = require('../utils/totp');
const { logAuditEvent } = require('../middleware/security');

const AuthController = {
  // ===== REGISTER =====
  async register(req, res, next) {
    const { username, email, password, gender } = req.body;
    if (!username || !email || !password || !gender) {
      return res.status(400).json({ error: 'Username, email, password, and gender are required' });
    }

    if (gender !== 'Male' && gender !== 'Female') {
      return res.status(400).json({ error: 'Gender must be either Male or Female' });
    }

    const usernameLower = username.toLowerCase().trim();
    const emailLower = email.toLowerCase().trim();

    const userRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!userRegex.test(usernameLower)) {
      return res.status(400).json({ error: 'Username must be 3-20 characters (alphanumeric and underscores).' });
    }

    try {
      const existingUser = await dbGet('SELECT id FROM users WHERE username = ? OR email = ?', [usernameLower, emailLower]);
      if (existingUser) {
        return res.status(400).json({ error: 'Username or email already taken.' });
      }

      const passwordHash = bcrypt.hashSync(password, 12);

      const userResult = await dbRun(
        'INSERT INTO users (username, email, password_hash, is_verified, verification_token, gender) VALUES (?, ?, ?, 1, NULL, ?)',
        [usernameLower, emailLower, passwordHash, gender]
      );
      
      const userId = userResult.id;

      const avatarUrl = gender === 'Male'
        ? `https://api.dicebear.com/7.x/adventurer/svg?seed=Felix_${usernameLower}`
        : `https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka_${usernameLower}`;

      // Initialize default Profile
      await dbRun(
        `INSERT INTO profiles (user_id, site_title, hero_title, hero_subtitle, hero_description, about_bio, email, avatar_url) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          `${usernameLower} | Showcase`,
          `Hi, I'm ${usernameLower}`,
          'Creative Developer',
          'Welcome to my professional career showcase page.',
          'I am a software builder passionate about engineering clean solutions.',
          emailLower,
          avatarUrl
        ]
      );

      // Initialize default Portfolio Settings
      await dbRun(
        `INSERT INTO portfolio_settings (user_id, seo_title, seo_description) 
         VALUES (?, ?, ?)`,
        [userId, `${usernameLower} | Developer Portfolio`, `Explore projects and blogs by ${usernameLower}.`]
      );

      await logAuditEvent(userId, 'REGISTER_SUCCESS', { username: usernameLower }, req.ip);

      res.status(201).json({ 
        message: 'Registration successful! You can now log in.'
      });
    } catch (err) {
      next(err);
    }
  },

  // ===== EMAIL VERIFICATION =====
  async verifyEmail(req, res, next) {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Verification token is required' });

    try {
      const user = await dbGet('SELECT id FROM users WHERE verification_token = ?', [token]);
      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired verification token.' });
      }

      await dbRun('UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?', [user.id]);
      await logAuditEvent(user.id, 'EMAIL_VERIFIED', {}, req.ip);

      res.json({ message: 'Your email has been verified! You can now log in.' });
    } catch (err) {
      next(err);
    }
  },

  // ===== LOGIN =====
  async login(req, res, next) {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username/email and password are required' });
    }

    const identity = username.toLowerCase().trim();

    try {
      const user = await dbGet('SELECT * FROM users WHERE username = ? OR email = ?', [identity, identity]);
      if (!user || !bcrypt.compareSync(password, user.password_hash)) {
        return res.status(401).json({ error: 'Invalid username or password.' });
      }

      if (
        user.is_verified !== 1 && user.is_verified !== true &&
        user.email_verified !== 1 && user.email_verified !== true &&
        user.isVerified !== 1 && user.isVerified !== true
      ) {
        return res.status(403).json({
          success: false,
          message: 'Please verify your email before logging in.'
        });
      }

      if (user.is_suspended) {
        return res.status(403).json({ error: 'Your account has been suspended.' });
      }

      // Check for 2FA
      if (user.two_factor_enabled) {
        const tempToken = crypto.randomBytes(32).toString('hex');
        // Store tempToken in session or send to client to verify later
        await dbRun('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?', [
          tempToken,
          new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5m expiry
          user.id
        ]);
        
        return res.json({ 
          twoFactorRequired: true,
          tempToken
        });
      }

      // Normal Login
      const accessToken = TokenService.generateAccessToken(user);
      const refreshToken = TokenService.generateRefreshToken(user);

      await TokenService.saveRefreshToken(user.id, refreshToken, req.headers['user-agent'], req.ip);
      await logAuditEvent(user.id, 'LOGIN_SUCCESS', {}, req.ip);

      // Set cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json({
        accessToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    } catch (err) {
      next(err);
    }
  },

  // ===== VERIFY 2FA =====
  async verify2FA(req, res, next) {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) {
      return res.status(400).json({ error: 'Temporary token and 2FA code are required' });
    }

    try {
      const user = await dbGet('SELECT * FROM users WHERE reset_token = ?', [tempToken]);
      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired session token.' });
      }

      const expiry = new Date(user.reset_token_expires);
      if (expiry < new Date()) {
        return res.status(400).json({ error: '2FA session has expired. Please log in again.' });
      }

      const verified = verifyTOTP(code, user.two_factor_secret);
      if (!verified) {
        return res.status(400).json({ error: 'Invalid 2FA code.' });
      }

      // Clear temp reset token
      await dbRun('UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [user.id]);

      // Complete login
      const accessToken = TokenService.generateAccessToken(user);
      const refreshToken = TokenService.generateRefreshToken(user);

      await TokenService.saveRefreshToken(user.id, refreshToken, req.headers['user-agent'], req.ip);
      await logAuditEvent(user.id, 'LOGIN_SUCCESS_2FA', {}, req.ip);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.json({
        accessToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    } catch (err) {
      next(err);
    }
  },

  // ===== REFRESH TOKEN =====
  async refresh(req, res, next) {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token missing' });

    try {
      const isValid = await TokenService.isRefreshTokenValid(refreshToken);
      if (!isValid) return res.status(403).json({ error: 'Invalid or revoked refresh token' });

      const decoded = TokenService.verifyRefreshToken(refreshToken);
      if (!decoded) return res.status(403).json({ error: 'Expired refresh token' });

      const user = await dbGet('SELECT * FROM users WHERE id = ?', [decoded.id]);
      if (!user || user.is_suspended) {
        return res.status(403).json({ error: 'User is suspended or doesn\'t exist.' });
      }

      // Rotate Refresh Token
      await TokenService.revokeRefreshToken(refreshToken);
      const newAccessToken = TokenService.generateAccessToken(user);
      const newRefreshToken = TokenService.generateRefreshToken(user);

      await TokenService.saveRefreshToken(user.id, newRefreshToken, req.headers['user-agent'], req.ip);

      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.json({
        accessToken: newAccessToken
      });
    } catch (err) {
      next(err);
    }
  },

  // ===== LOGOUT =====
  async logout(req, res, next) {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    try {
      if (refreshToken) {
        await TokenService.revokeRefreshToken(refreshToken);
      }
      res.clearCookie('refreshToken');
      res.json({ message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  },

  // ===== SETUP 2FA =====
  async setup2FA(req, res, next) {
    const userId = req.user.id;
    try {
      const user = await dbGet('SELECT username FROM users WHERE id = ?', [userId]);
      const { secret, otpauthUrl } = generateSecret(user.username);
      
      // Store secret as temp reset_token until verified
      await dbRun('UPDATE users SET reset_token = ? WHERE id = ?', [secret, userId]);

      res.json({
        secret,
        otpauthUrl
      });
    } catch (err) {
      next(err);
    }
  },

  // ===== VERIFY & ACTIVATE 2FA =====
  async enable2FA(req, res, next) {
    const userId = req.user.id;
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: '2FA verification code is required' });

    try {
      const user = await dbGet('SELECT reset_token FROM users WHERE id = ?', [userId]);
      const secret = user.reset_token;

      if (!secret) return res.status(400).json({ error: '2FA setup was not initialized.' });

      const verified = verifyTOTP(code, secret);
      if (!verified) {
        return res.status(400).json({ error: 'Verification failed. Invalid code.' });
      }

      await dbRun(
        'UPDATE users SET two_factor_secret = ?, two_factor_enabled = 1, reset_token = NULL WHERE id = ?',
        [secret, userId]
      );
      await logAuditEvent(userId, 'ENABLE_2FA', {}, req.ip);

      res.json({ message: '2FA has been enabled successfully!' });
    } catch (err) {
      next(err);
    }
  },

  // ===== DISABLE 2FA =====
  async disable2FA(req, res, next) {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password) return res.status(400).json({ error: 'Password is required to disable 2FA' });

    try {
      const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
      if (!bcrypt.compareSync(password, user.password_hash)) {
        return res.status(400).json({ error: 'Invalid password.' });
      }

      await dbRun('UPDATE users SET two_factor_secret = NULL, two_factor_enabled = 0 WHERE id = ?', [userId]);
      await logAuditEvent(userId, 'DISABLE_2FA', {}, req.ip);

      res.json({ message: '2FA has been disabled.' });
    } catch (err) {
      next(err);
    }
  },

  // ===== PASSWORD RESET REQUEST =====
  async requestPasswordReset(req, res, next) {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    try {
      const user = await dbGet('SELECT id, username FROM users WHERE email = ?', [email.toLowerCase().trim()]);
      if (!user) {
        // Return 200 even if user not found for security reasons
        return res.json({ message: 'If email exists, reset instructions have been logged to the console.' });
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 mins

      await dbRun(
        'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
        [resetToken, resetTokenExpires, user.id]
      );

      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const resetLink = `${clientUrl}/reset-password?token=${resetToken}`;

      try {
        await EmailService.sendPasswordResetEmail(email.toLowerCase().trim(), user.username, resetLink);
        console.log(`✉️  Password reset email sent to ${email}`);
      } catch (emailErr) {
        console.error('⚠️  Failed to send password reset email:', emailErr.message);
        console.log(`🔗 Fallback reset link for ${user.username}: ${resetLink}`);
      }

      await logAuditEvent(user.id, 'PASSWORD_RESET_REQUESTED', {}, req.ip);

      res.json({ 
        message: 'Password reset instructions have been sent to your email.',
        resetLink // retained for testing convenience
      });
    } catch (err) {
      next(err);
    }
  },

  // ===== PASSWORD RESET VERIFICATION =====
  async resetPassword(req, res, next) {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    try {
      const user = await dbGet('SELECT * FROM users WHERE reset_token = ?', [token]);
      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired reset token.' });
      }

      const expiry = new Date(user.reset_token_expires);
      if (expiry < new Date()) {
        return res.status(400).json({ error: 'Reset token has expired.' });
      }

      const passwordHash = bcrypt.hashSync(newPassword, 12);
      await dbRun(
        'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
        [passwordHash, user.id]
      );

      await logAuditEvent(user.id, 'PASSWORD_RESET_SUCCESS', {}, req.ip);

      res.json({ message: 'Password has been reset successfully! You can now log in.' });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = AuthController;
