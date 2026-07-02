const { dbGet, dbRun, dbAll } = require('../config/db');

const SuperAdminController = {
  // ===== 1. GET ALL USERS =====
  async listUsers(req, res, next) {
    try {
      const list = await dbAll(
        `SELECT u.id, u.username, u.email, u.role, u.is_verified, u.is_suspended, u.created_at,
                (SELECT COUNT(*) FROM projects WHERE user_id = u.id) as projects_count
         FROM users u
         ORDER BY u.created_at DESC`
      );
      res.json(list);
    } catch (err) {
      next(err);
    }
  },

  // ===== 2. TOGGLE USER SUSPENSION =====
  async toggleSuspend(req, res, next) {
    const targetUserId = req.params.id;
    try {
      const targetUser = await dbGet('SELECT * FROM users WHERE id = ?', [targetUserId]);
      if (!targetUser) return res.status(404).json({ error: 'User not found' });
      if (targetUser.role === 'super_admin') {
        return res.status(400).json({ error: 'Cannot suspend a super admin' });
      }

      const newSuspensionState = targetUser.is_suspended === 1 ? 0 : 1;
      await dbRun('UPDATE users SET is_suspended = ? WHERE id = ?', [newSuspensionState, targetUserId]);
      
      // Revoke any active sessions if suspended
      if (newSuspensionState === 1) {
        await dbRun('UPDATE sessions SET is_revoked = 1 WHERE user_id = ?', [targetUserId]);
      }

      res.json({ 
        message: `User ${targetUser.username} has been ${newSuspensionState === 1 ? 'suspended' : 'unsuspended'}.`,
        is_suspended: newSuspensionState
      });
    } catch (err) {
      next(err);
    }
  },

  // ===== 3. PROMOTE / DEMOTE ROLE =====
  async updateRole(req, res, next) {
    const targetUserId = req.params.id;
    const { role } = req.body; // 'user' or 'super_admin'

    if (!['user', 'super_admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    try {
      const targetUser = await dbGet('SELECT * FROM users WHERE id = ?', [targetUserId]);
      if (!targetUser) return res.status(404).json({ error: 'User not found' });

      await dbRun('UPDATE users SET role = ? WHERE id = ?', [role, targetUserId]);
      res.json({ message: `Role of ${targetUser.username} updated to ${role}` });
    } catch (err) {
      next(err);
    }
  },

  // ===== 4. LIST AUDIT LOGS =====
  async listAuditLogs(req, res, next) {
    try {
      const list = await dbAll(
        `SELECT a.*, u.username 
         FROM audit_logs a
         LEFT JOIN users u ON a.user_id = u.id
         ORDER BY a.created_at DESC LIMIT 100`
      );
      res.json(list);
    } catch (err) {
      next(err);
    }
  }
};

module.exports = SuperAdminController;
