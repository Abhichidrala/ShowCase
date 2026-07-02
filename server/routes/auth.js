const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { registerLimiter, passwordResetLimiter } = require('../middleware/security');

const isProduction = process.env.NODE_ENV === 'production';

router.post('/register', ...(isProduction ? [registerLimiter] : []), AuthController.register);
router.post('/verify-email', AuthController.verifyEmail);
router.post('/login', AuthController.login);
router.post('/login/2fa', AuthController.verify2FA);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);

// 2FA setups (Requires authentication)
router.post('/2fa/setup', authenticateToken, AuthController.setup2FA);
router.post('/2fa/enable', authenticateToken, AuthController.enable2FA);
router.post('/2fa/disable', authenticateToken, AuthController.disable2FA);

// Password Resets
router.post('/password-reset/request', passwordResetLimiter, AuthController.requestPasswordReset);
router.post('/password-reset/reset', AuthController.resetPassword);

module.exports = router;
