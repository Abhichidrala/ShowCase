const express = require('express');
const router = express.Router();
const { dbGet, dbRun, dbAll } = require('../db/db');
const { requireSuperAdmin } = require('../middleware/auth');

// Apply super admin validation to all sub-routes
router.use(requireSuperAdmin);

// ===== PLATFORM MANAGEMENT DASHBOARD =====
router.get('/', async (req, res, next) => {
  try {
    const stats = {
      totalUsers: (await dbGet('SELECT COUNT(*) as cnt FROM users')).cnt,
      verifiedUsers: (await dbGet('SELECT COUNT(*) as cnt FROM users WHERE is_verified = 1')).cnt,
      suspendedUsers: (await dbGet('SELECT COUNT(*) as cnt FROM users WHERE is_suspended = 1')).cnt,
      totalReports: (await dbGet('SELECT COUNT(*) as cnt FROM reports WHERE status = "pending"')).cnt,
      totalProjects: (await dbGet('SELECT COUNT(*) as cnt FROM projects')).cnt,
      totalBlogs: (await dbGet('SELECT COUNT(*) as cnt FROM blogs')).cnt
    };

    // Load recent reported portfolios
    const reports = await dbAll(`
      SELECT r.*, ru.username as reported_username, rp.username as reporter_username
      FROM reports r
      JOIN users ru ON r.reported_user_id = ru.id
      JOIN users rp ON r.reporter_id = rp.id
      WHERE r.status = 'pending'
      ORDER BY r.created_at DESC
    `);

    // Load all platform users
    const users = await dbAll('SELECT id, username, email, role, is_verified, is_suspended, created_at FROM users ORDER BY created_at DESC');

    res.render('admin/superAdmin/index', {
      title: 'Platform Management | Super Admin',
      stats,
      reports,
      users,
      success: req.query.success,
      error: req.query.error
    });
  } catch (err) {
    next(err);
  }
});

// ===== TOGGLE VERIFICATION STATUS =====
router.post('/users/:id/verify', async (req, res, next) => {
  const userId = req.params.id;
  try {
    const user = await dbGet('SELECT is_verified FROM users WHERE id = ?', [userId]);
    if (!user) return res.redirect('/super-admin?error=User not found');

    const newStatus = user.is_verified ? 0 : 1;
    await dbRun('UPDATE users SET is_verified = ? WHERE id = ?', [newStatus, userId]);
    res.redirect(`/super-admin?success=Verification status updated for user ID: ${userId}`);
  } catch (err) {
    next(err);
  }
});

// ===== TOGGLE USER SUSPENSION =====
router.post('/users/:id/suspend', async (req, res, next) => {
  const userId = req.params.id;
  try {
    const user = await dbGet('SELECT is_suspended, role FROM users WHERE id = ?', [userId]);
    if (!user) return res.redirect('/super-admin?error=User not found');
    if (user.role === 'super_admin') return res.redirect('/super-admin?error=Super Admin accounts cannot be suspended.');

    const newStatus = user.is_suspended ? 0 : 1;
    await dbRun('UPDATE users SET is_suspended = ? WHERE id = ?', [newStatus, userId]);
    res.redirect(`/super-admin?success=Suspension status toggled for user ID: ${userId}`);
  } catch (err) {
    next(err);
  }
});

// ===== DISMISS REPORT =====
router.post('/reports/:id/dismiss', async (req, res, next) => {
  const reportId = req.params.id;
  try {
    await dbRun('UPDATE reports SET status = "resolved" WHERE id = ?', [reportId]);
    res.redirect('/super-admin?success=Report marked as resolved/dismissed.');
  } catch (err) {
    next(err);
  }
});

// ===== DELETE REPORTED USER PORFTOLIO CONTENT =====
router.post('/reports/:id/clear-portfolio', async (req, res, next) => {
  const reportId = req.params.id;
  try {
    const report = await dbGet('SELECT reported_user_id FROM reports WHERE id = ?', [reportId]);
    if (!report) return res.redirect('/super-admin?error=Report not found');

    const targetUser = report.reported_user_id;

    // Purge target's projects, experience, blogs, etc.
    await dbRun('DELETE FROM projects WHERE user_id = ?', [targetUser]);
    await dbRun('DELETE FROM blogs WHERE user_id = ?', [targetUser]);
    await dbRun('DELETE FROM experience WHERE user_id = ?', [targetUser]);
    await dbRun('DELETE FROM education WHERE user_id = ?', [targetUser]);
    await dbRun('DELETE FROM certificates WHERE user_id = ?', [targetUser]);
    await dbRun('DELETE FROM gallery WHERE user_id = ?', [targetUser]);
    await dbRun('DELETE FROM achievements WHERE user_id = ?', [targetUser]);

    // Update report
    await dbRun('UPDATE reports SET status = "resolved" WHERE id = ?', [reportId]);
    res.redirect('/super-admin?success=Content purged successfully for reported user.');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
