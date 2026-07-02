const TokenService = require('../services/tokenService');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Access token missing' });
  }

  const payload = TokenService.verifyAccessToken(token);
  if (!payload) {
    return res.status(403).json({ error: 'Invalid or expired access token' });
  }

  req.user = payload;
  next();
};

const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const hasRole = req.user.role === role || req.user.role === 'super_admin';
    if (!hasRole) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    
    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole
};
