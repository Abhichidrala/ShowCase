const express = require('express');
const router = express.Router();
const PublicController = require('../controllers/publicController');

router.get('/discover', PublicController.getDiscoverFeed);
router.get('/search', PublicController.search);
router.get('/blogs', PublicController.getBlogs);
router.get('/blogs/:username/:slug', PublicController.getBlogBySlug);
router.post('/analytics/track', PublicController.trackAnalytics);

module.exports = router;
