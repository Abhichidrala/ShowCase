const { dbGet } = require('../db/db');

async function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    // Check if user is suspended
    try {
      const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.session.userId]);
      if (user && user.is_suspended) {
        req.session.destroy(() => {
          res.status(403).render('error', {
            title: 'Account Suspended',
            message: 'Your account has been suspended by the platform administrator.',
            code: 403
          });
        });
        return;
      }
      return next();
    } catch (err) {
      console.error(err);
      return res.status(500).render('error', { title: 'Error', message: 'Internal auth validation error', code: 500 });
    }
  }
  req.session.returnTo = req.originalUrl;
  res.redirect('/login');
}

async function requireSuperAdmin(req, res, next) {
  if (req.session && req.session.userId) {
    try {
      const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.session.userId]);
      if (user && user.role === 'super_admin') {
        return next();
      }
    } catch (err) {
      console.error(err);
    }
  }
  res.status(403).render('error', {
    title: 'Forbidden',
    message: 'You do not have administrative privileges to access this area.',
    code: 403
  });
}

async function injectUser(req, res, next) {
  res.locals.currentPath = req.path;
  res.locals.csrfToken = req.session ? (req.session.csrfToken || '') : '';
  
  if (req.session && req.session.userId) {
    try {
      const user = await dbGet('SELECT id, username, email, role, is_suspended FROM users WHERE id = ?', [req.session.userId]);
      if (user && !user.is_suspended) {
        res.locals.user = user;
        const profile = await dbGet('SELECT * FROM profiles WHERE user_id = ?', [user.id]);
        res.locals.userProfile = profile || null;
        return next();
      }
    } catch (err) {
      console.error('Error injecting user:', err);
    }
  }
  
  res.locals.user = null;
  res.locals.userProfile = null;
  next();
}

module.exports = { requireAuth, requireSuperAdmin, injectUser };
