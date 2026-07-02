const express = require('express');
const router = express.Router();
const PortfolioController = require('../controllers/portfolioController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Soft auth helper to fetch follower relationship details if user is logged in
const softAuthenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    const TokenService = require('../services/tokenService');
    const payload = TokenService.verifyAccessToken(token);
    if (payload) {
      req.user = payload;
    }
  }
  next();
};

router.get('/:username', softAuthenticate, PortfolioController.getByUsername);
router.post('/:username/message', softAuthenticate, PortfolioController.sendMessage);

// Authenticated social actions
router.post('/:username/recommend', authenticateToken, PortfolioController.giveRecommendation);
router.post('/:username/follow', authenticateToken, PortfolioController.toggleFollow);

module.exports = router;
