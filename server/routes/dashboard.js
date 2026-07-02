const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

// All dashboard endpoints require valid JWT authentication
router.use(authenticateToken);

// Summary Stats
router.get('/summary', DashboardController.getSummary);

// Profile
router.get('/profile', DashboardController.getProfile);
router.put('/profile', upload.single('avatar'), DashboardController.updateProfile);

// Portfolio Settings
router.put('/settings', DashboardController.updateSettings);

// Projects
router.get('/projects', DashboardController.getProjects);
router.post('/projects', upload.single('image'), DashboardController.createProject);
router.put('/projects/:id', upload.single('image'), DashboardController.updateProject);
router.delete('/projects/:id', DashboardController.deleteProject);

// Skills
router.get('/skills', DashboardController.getSkills);
router.post('/skills', DashboardController.createSkill);
router.put('/skills/:id', DashboardController.updateSkill);
router.delete('/skills/:id', DashboardController.deleteSkill);

// Experience
router.get('/experience', DashboardController.getExperience);
router.post('/experience', DashboardController.createExperience);
router.put('/experience/:id', DashboardController.updateExperience);
router.delete('/experience/:id', DashboardController.deleteExperience);

// Education
router.get('/education', DashboardController.getEducation);
router.post('/education', DashboardController.createEducation);
router.put('/education/:id', DashboardController.updateEducation);
router.delete('/education/:id', DashboardController.deleteEducation);

// Certificates
router.get('/certificates', DashboardController.getCertificates);
router.post('/certificates', upload.single('image'), DashboardController.createCertificate);
router.delete('/certificates/:id', DashboardController.deleteCertificate);

// Social Links
router.get('/social-links', DashboardController.getSocialLinks);
router.post('/social-links', DashboardController.saveSocialLinks);

// Blogs
router.get('/blogs', DashboardController.getBlogs);
router.post('/blogs', upload.single('cover'), DashboardController.createBlog);
router.put('/blogs/:id', upload.single('cover'), DashboardController.updateBlog);
router.delete('/blogs/:id', DashboardController.deleteBlog);

// Messages
router.get('/messages', DashboardController.getMessages);
router.put('/messages/:id/read', DashboardController.markMessageRead);
router.delete('/messages/:id', DashboardController.deleteMessage);

// Recommendations
router.get('/recommendations', DashboardController.getRecommendations);
router.put('/recommendations/:id/status', DashboardController.updateRecommendationStatus);

// Themes
router.get('/themes', DashboardController.getThemes);

// Analytics
router.get('/analytics', DashboardController.getAnalytics);

module.exports = router;
