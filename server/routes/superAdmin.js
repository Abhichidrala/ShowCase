const express = require('express');
const router = express.Router();
const SuperAdminController = require('../controllers/superAdminController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

// Super admin routes must be authenticated and restricted to the super_admin role
router.use(authenticateToken);
router.use(requireRole('super_admin'));

router.get('/users', SuperAdminController.listUsers);
router.post('/users/:id/suspend', SuperAdminController.toggleSuspend);
router.post('/users/:id/role', SuperAdminController.updateRole);
router.get('/audit-logs', SuperAdminController.listAuditLogs);

module.exports = router;
