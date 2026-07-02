const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { marked } = require('marked');
const { dbGet, dbRun, dbAll } = require('../db/db');
const { verifyTOTP } = require('../utils/totp');
const { registerLimiter, passwordResetLimiter } = require('../middleware/security');

marked.setOptions({ breaks: true, gfm: true });

function readingTime(text) {
  const words = (text || '').trim().split(/\s+/).length;
  return Math.ceil(words / 200);
}

// Helper to load platform stats and directory
async function getPlatformData() {
  const usersCount = await dbGet('SELECT COUNT(*) as cnt FROM users WHERE is_suspended = 0');
  const projectsCount = await dbGet('SELECT COUNT(*) as cnt FROM projects');
  const activities = await dbAll(`
    SELECT a.*, u.username 
    FROM activities a
    JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at DESC LIMIT 10
  `);
  return {
    usersCount: usersCount ? usersCount.cnt : 0,
    projectsCount: projectsCount ? projectsCount.cnt : 0,
    activities
  };
}

// ===== PLATFORM LANDING PAGE =====
router.get('/', async (req, res, next) => {
  try {
    // If a session has settings from the old structure, fallback, but here we render the SaaS home
    const { usersCount, projectsCount, activities } = await getPlatformData();
    
    // Get featured developers
    const featuredDevs = await dbAll(`
      SELECT u.username, p.site_title, p.hero_subtitle, p.avatar_url, p.about_bio
      FROM users u
      JOIN profiles p ON u.id = p.user_id
      WHERE u.is_suspended = 0 AND p.privacy_status = 'public'
      LIMIT 6
    `);

    res.render('platform/landing', {
      title: 'Showcase SaaS | Professional Dev Network',
      usersCount,
      projectsCount,
      activities,
      featuredDevs,
      settings: {
        site_title: 'Showcase SaaS',
        site_description: 'Build your premium interactive portfolio and connect with top developer talent.',
        accent_color: '#ffffff',
        accent_gradient: 'linear-gradient(135deg, #ffffff, #666666)'
      }
    });
  } catch (err) {
    next(err);
  }
});

// ===== REGISTER =====
router.get('/register', (req, res) => {
  if (req.session.userId) return res.redirect('/admin');
  res.render('platform/register', { title: 'Create Account', error: null, success: null });
});

router.post('/register', registerLimiter, async (req, res, next) => {
  const { username, email, password, confirm_password } = req.body;
  if (!username || !email || !password) {
    return res.render('platform/register', { title: 'Create Account', error: 'All fields are required.', success: null });
  }

  // Regex validations
  const userRegex = /^[a-zA-Z0-9_]{3,20}$/;
  if (!userRegex.test(username)) {
    return res.render('platform/register', { title: 'Create Account', error: 'Username must be 3-20 characters (alphanumeric and underscores).', success: null });
  }

  if (password !== confirm_password) {
    return res.render('platform/register', { title: 'Create Account', error: 'Passwords do not match.', success: null });
  }

  try {
    const existingUser = await dbGet('SELECT id FROM users WHERE username = ? OR email = ?', [username.toLowerCase(), email.toLowerCase()]);
    if (existingUser) {
      return res.render('platform/register', { title: 'Create Account', error: 'Username or email already taken.', success: null });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const passwordHash = bcrypt.hashSync(password, 12);

    const userResult = await dbRun(
      'INSERT INTO users (username, email, password_hash, is_verified, verification_token) VALUES (?, ?, ?, 0, ?)',
      [username.toLowerCase(), email.toLowerCase(), passwordHash, verificationToken]
    );

    // Initialize Default Profile
    await dbRun(
      `INSERT INTO profiles (user_id, site_title, hero_title, hero_subtitle, hero_description, about_bio, email, accent_color, accent_gradient, footer_text) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userResult.id,
        `${username} | Portfolio`,
        `Hi, I'm ${username}`,
        'Creative Developer',
        'Welcome to my professional showcase portfolio page.',
        'I am a software engineer passionate about modern web technologies and craft clean code solutions.',
        email,
        '#ffffff',
        'linear-gradient(135deg, #ffffff, #666666)',
        `© 2026 ${username}. All rights reserved.`
      ]
    );

    // Log the verification link to the server console for testing
    const verifyLink = `http://localhost:${process.env.PORT || 3000}/verify-email?token=${verificationToken}`;
    console.log('\n=======================================');
    console.log(`✉️ Verification Email for ${username}:`);
    console.log(`Link: ${verifyLink}`);
    console.log('=======================================\n');

    res.render('platform/register', { 
      title: 'Create Account', 
      error: null, 
      success: 'Account created! Please check the server console logs for your verification email link to verify your account.' 
    });
  } catch (err) {
    next(err);
  }
});

// ===== EMAIL VERIFICATION =====
router.get('/verify-email', async (req, res, next) => {
  const { token } = req.query;
  if (!token) return res.redirect('/login');

  try {
    const user = await dbGet('SELECT id FROM users WHERE verification_token = ?', [token]);
    if (!user) {
      return res.status(400).render('error', { title: 'Verification Failed', message: 'Invalid or expired verification token.', code: 400 });
    }

    await dbRun('UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?', [user.id]);
    res.render('platform/login', { 
      title: 'Login', 
      error: null, 
      success: 'Your email has been verified! You can now log in.',
      csrfToken: req.session.csrfToken
    });
  } catch (err) {
    next(err);
  }
});

// ===== LOGIN =====
router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/admin');
  res.render('platform/login', { title: 'Login', error: null, success: null });
});

router.post('/login', async (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.render('platform/login', { title: 'Login', error: 'Username and password are required.', success: null });
  }

  try {
    const user = await dbGet('SELECT * FROM users WHERE username = ? OR email = ?', [username.toLowerCase(), username.toLowerCase()]);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.render('platform/login', { title: 'Login', error: 'Invalid credentials.', success: null });
    }

    if (!user.is_verified) {
      return res.render('platform/login', { title: 'Login', error: 'Please verify your email before logging in.', success: null });
    }

    if (user.is_suspended) {
      return res.render('platform/login', { title: 'Login', error: 'Your account has been suspended.', success: null });
    }

    // Check if 2FA is active
    if (user.two_factor_enabled) {
      req.session.tempUserId = user.id;
      return res.redirect('/login/2fa');
    }

    // Standard session login
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;

    res.redirect('/admin');
  } catch (err) {
    next(err);
  }
});

// ===== 2FA LOGIN CHALLENGE =====
router.get('/login/2fa', (req, res) => {
  if (!req.session.tempUserId) return res.redirect('/login');
  res.render('platform/two-factor', { title: '2FA Verification', error: null });
});

router.post('/login/2fa', async (req, res, next) => {
  if (!req.session.tempUserId) return res.redirect('/login');
  const { token } = req.body;

  try {
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.session.tempUserId]);
    if (!user) {
      delete req.session.tempUserId;
      return res.redirect('/login');
    }

    const isValid = verifyTOTP(token, user.two_factor_secret);
    if (!isValid) {
      return res.render('platform/two-factor', { title: '2FA Verification', error: 'Invalid 2FA authentication token.' });
    }

    // Establish full login session
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    delete req.session.tempUserId;

    res.redirect('/admin');
  } catch (err) {
    next(err);
  }
});

// ===== LOGOUT =====
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// ===== FORGOT & RESET PASSWORD =====
router.get('/forgot-password', (req, res) => {
  res.render('platform/forgot-password', { title: 'Forgot Password', error: null, success: null });
});

router.post('/forgot-password', passwordResetLimiter, async (req, res, next) => {
  const { email } = req.body;
  if (!email) return res.render('platform/forgot-password', { title: 'Forgot Password', error: 'Email is required.', success: null });

  try {
    const user = await dbGet('SELECT id, username FROM users WHERE email = ?', [email.toLowerCase()]);
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 mins

      await dbRun('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?', [resetToken, resetTokenExpires, user.id]);

      const resetLink = `http://localhost:${process.env.PORT || 3000}/reset-password?token=${resetToken}`;
      console.log('\n=======================================');
      console.log(`✉️ Password Reset Email for ${user.username}:`);
      console.log(`Link: ${resetLink}`);
      console.log('=======================================\n');
    }

    // Render success regardless of whether email exists to prevent user enumeration
    res.render('platform/forgot-password', { 
      title: 'Forgot Password', 
      error: null, 
      success: 'If that email exists in our system, we have logged a password reset link in the server console.' 
    });
  } catch (err) {
    next(err);
  }
});

router.get('/reset-password', async (req, res, next) => {
  const { token } = req.query;
  if (!token) return res.redirect('/login');

  try {
    const user = await dbGet('SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > ?', [token, new Date().toISOString()]);
    if (!user) {
      return res.status(400).render('error', { title: 'Reset Failed', message: 'Token is invalid or has expired.', code: 400 });
    }
    res.render('platform/reset-password', { title: 'Reset Password', token, error: null });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', async (req, res, next) => {
  const { token, password, confirm_password } = req.body;
  if (!token || !password) return res.redirect('/login');

  if (password !== confirm_password) {
    return res.render('platform/reset-password', { title: 'Reset Password', token, error: 'Passwords do not match.' });
  }

  try {
    const user = await dbGet('SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > ?', [token, new Date().toISOString()]);
    if (!user) {
      return res.status(400).render('error', { title: 'Reset Failed', message: 'Token is invalid or has expired.', code: 400 });
    }

    const hash = bcrypt.hashSync(password, 12);
    await dbRun('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [hash, user.id]);

    res.render('platform/login', { 
      title: 'Login', 
      error: null, 
      success: 'Password reset successfully! You can now log in.' 
    });
  } catch (err) {
    next(err);
  }
});

// ===== SEARCH / DISCOVER DIRECTORY =====
router.get('/discover', async (req, res, next) => {
  const query = (req.query.q || '').trim();
  const filterSkill = (req.query.skill || '').trim();

  try {
    let users;
    if (query || filterSkill) {
      let sql = `
        SELECT DISTINCT u.username, p.site_title, p.hero_subtitle, p.avatar_url, p.about_bio
        FROM users u
        JOIN profiles p ON u.id = p.user_id
        LEFT JOIN skills s ON u.id = s.user_id
        WHERE u.is_suspended = 0 AND p.privacy_status = 'public'
      `;
      const params = [];

      if (query) {
        sql += ` AND (u.username LIKE ? OR p.site_title LIKE ? OR p.about_bio LIKE ?)`;
        params.push(`%${query}%`, `%${query}%`, `%${query}%`);
      }
      if (filterSkill) {
        sql += ` AND s.name LIKE ?`;
        params.push(`%${filterSkill}%`);
      }

      users = await dbAll(sql, params);
    } else {
      users = await dbAll(`
        SELECT u.username, p.site_title, p.hero_subtitle, p.avatar_url, p.about_bio
        FROM users u
        JOIN profiles p ON u.id = p.user_id
        WHERE u.is_suspended = 0 AND p.privacy_status = 'public'
      `);
    }

    res.render('platform/discover', {
      title: 'Discover Developer Portfolios | Showcase SaaS',
      users,
      query,
      filterSkill,
      settings: {
        accent_color: '#ffffff',
        accent_gradient: 'linear-gradient(135deg, #ffffff, #666666)'
      }
    });
  } catch (err) {
    next(err);
  }
});

// ===== DYNAMIC USER PORTFOLIO SUB-ROUTES =====

// Dynamic portfolio context injection middleware
async function resolvePortfolioUser(req, res, next) {
  const { username } = req.params;
  
  // Exclude static landing paths
  const staticWords = ['login', 'register', 'verify-email', 'forgot-password', 'reset-password', 'discover', 'admin', 'super-admin', 'logout'];
  if (staticWords.includes(username.toLowerCase())) {
    return next();
  }

  try {
    const portfolioUser = await dbGet('SELECT * FROM users WHERE username = ?', [username.toLowerCase()]);
    if (!portfolioUser) {
      return res.status(404).render('error', { title: '404 — User Not Found', message: `The developer portfolio for "${username}" does not exist.`, code: 404 });
    }

    if (portfolioUser.is_suspended) {
      return res.status(403).render('error', { title: 'Account Suspended', message: 'This showcase portfolio has been suspended by the administrator.', code: 403 });
    }

    const profile = await dbGet('SELECT * FROM profiles WHERE user_id = ?', [portfolioUser.id]);
    if (!profile) {
      return res.status(404).render('error', { title: '404', message: 'Portfolio profile is uninitialized.', code: 404 });
    }

    // Privacy verification
    if (profile.privacy_status === 'private' && (!req.session || req.session.userId !== portfolioUser.id)) {
      return res.status(403).render('error', { title: 'Private Portfolio', message: 'This developer portfolio is set to private by the owner.', code: 403 });
    }

    // Set portfolio data in locals for sub-pages
    res.locals.portfolioUser = portfolioUser;
    res.locals.settings = profile; // Overrides platform layout settings with portfolio's settings
    res.locals.sectionVisibility = JSON.parse(profile.section_visibility || '{}');
    
    // Check connection status
    res.locals.connectionStatus = null;
    if (req.session && req.session.userId && req.session.userId !== portfolioUser.id) {
      const conn = await dbGet(
        `SELECT * FROM connections 
         WHERE (requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?)`,
        [req.session.userId, portfolioUser.id, portfolioUser.id, req.session.userId]
      );
      if (conn) {
        res.locals.connectionStatus = conn.status; // 'pending' or 'accepted'
      }
    }
    
    next();
  } catch (err) {
    next(err);
  }
}

// Portfolio Home page
router.get('/:username', resolvePortfolioUser, async (req, res, next) => {
  // If resolved target is null (was a static platform url like `/login`), let next handlers handle it
  if (!res.locals.portfolioUser) return next();

  const user = res.locals.portfolioUser;
  try {
    const allProjects = await dbAll('SELECT * FROM projects WHERE user_id = ? ORDER BY sort_order ASC', [user.id]);
    const featuredProjects = allProjects.filter(p => p.featured);
    const skills = await dbAll('SELECT * FROM skills WHERE user_id = ? ORDER BY sort_order ASC', [user.id]);
    const allBlogs = await dbAll('SELECT * FROM blogs WHERE user_id = ? AND published = 1 ORDER BY created_at DESC', [user.id]);
    const latestBlogs = allBlogs.slice(0, 3);
    const experience = await dbAll('SELECT * FROM experience WHERE user_id = ? ORDER BY sort_order ASC LIMIT 3', [user.id]);

    const skillsByCategory = {};
    for (const skill of skills) {
      if (!skillsByCategory[skill.category]) skillsByCategory[skill.category] = [];
      skillsByCategory[skill.category].push(skill);
    }

    for (const p of featuredProjects) {
      try { p.tech_stack_arr = JSON.parse(p.tech_stack); } catch { p.tech_stack_arr = []; }
    }
    for (const b of latestBlogs) {
      try { b.tags_arr = JSON.parse(b.tags); } catch { b.tags_arr = []; }
    }

    res.render('public/home', {
      title: res.locals.settings.site_title || `${user.username} | Portfolio`,
      featuredProjects,
      skills,
      skillsByCategory,
      latestBlogs,
      experience,
      readingTime
    });
  } catch (err) {
    next(err);
  }
});

// Portfolio Projects list
router.get('/:username/projects', resolvePortfolioUser, async (req, res, next) => {
  if (!res.locals.portfolioUser) return next();
  const user = res.locals.portfolioUser;

  try {
    const projects = await dbAll('SELECT * FROM projects WHERE user_id = ? ORDER BY sort_order ASC', [user.id]);
    for (const p of projects) {
      try { p.tech_stack_arr = JSON.parse(p.tech_stack); } catch { p.tech_stack_arr = []; }
    }

    res.render('public/projects', {
      title: 'Projects | ' + (res.locals.settings.site_title || `${user.username} Portfolio`),
      projects
    });
  } catch (err) {
    next(err);
  }
});

// Portfolio Project details
router.get('/:username/projects/:slug', resolvePortfolioUser, async (req, res, next) => {
  if (!res.locals.portfolioUser) return next();
  const user = res.locals.portfolioUser;

  try {
    const project = await dbGet('SELECT * FROM projects WHERE user_id = ? AND slug = ?', [user.id, req.params.slug]);
    if (!project) return res.status(404).render('error', { title: '404', message: 'Project not found.', code: 404 });
    
    try { project.tech_stack_arr = JSON.parse(project.tech_stack); } catch { project.tech_stack_arr = []; }
    project.long_description_html = marked(project.long_description || project.description);

    res.render('public/project-detail', {
      title: project.title + ' | Projects',
      project
    });
  } catch (err) {
    next(err);
  }
});

// Portfolio Blogs list
router.get('/:username/blog', resolvePortfolioUser, async (req, res, next) => {
  if (!res.locals.portfolioUser) return next();
  const user = res.locals.portfolioUser;

  try {
    const blogs = await dbAll('SELECT * FROM blogs WHERE user_id = ? AND published = 1 ORDER BY created_at DESC', [user.id]);
    for (const b of blogs) {
      try { b.tags_arr = JSON.parse(b.tags); } catch { b.tags_arr = []; }
      b.reading_time = readingTime(b.content);
    }

    res.render('public/blog', {
      title: 'Blog | ' + (res.locals.settings.site_title || `${user.username} Portfolio`),
      blogs
    });
  } catch (err) {
    next(err);
  }
});

// Portfolio Blog post details
router.get('/:username/blog/:slug', resolvePortfolioUser, async (req, res, next) => {
  if (!res.locals.portfolioUser) return next();
  const user = res.locals.portfolioUser;

  try {
    const blog = await dbGet('SELECT * FROM blogs WHERE user_id = ? AND slug = ? AND published = 1', [user.id, req.params.slug]);
    if (!blog) return res.status(404).render('error', { title: '404', message: 'Blog post not found.', code: 404 });
    
    try { blog.tags_arr = JSON.parse(blog.tags); } catch { blog.tags_arr = []; }
    blog.content_html = marked(blog.content);
    blog.reading_time = readingTime(blog.content);

    res.render('public/blog-post', {
      title: blog.title + ' | Blog',
      blog
    });
  } catch (err) {
    next(err);
  }
});

// Portfolio About page (with Connection listings, Endorsements, and Recommendations)
router.get('/:username/about', resolvePortfolioUser, async (req, res, next) => {
  if (!res.locals.portfolioUser) return next();
  const user = res.locals.portfolioUser;

  try {
    const experience = await dbAll('SELECT * FROM experience WHERE user_id = ? ORDER BY sort_order ASC', [user.id]);
    const education = await dbAll('SELECT * FROM education WHERE user_id = ? ORDER BY sort_order ASC', [user.id]);
    const certificates = await dbAll('SELECT * FROM certificates WHERE user_id = ? ORDER BY sort_order ASC', [user.id]);
    const skills = await dbAll('SELECT * FROM skills WHERE user_id = ? ORDER BY sort_order ASC', [user.id]);

    const skillsByCategory = {};
    for (const skill of skills) {
      // Get endorsements for each skill
      const endorsements = await dbAll(`
        SELECT u.username, p.site_title 
        FROM endorsements e
        JOIN users u ON e.giver_id = u.id
        JOIN profiles p ON u.id = p.user_id
        WHERE e.receiver_id = ? AND e.skill_id = ?
      `, [user.id, skill.id]);
      
      skill.endorsements = endorsements;

      if (!skillsByCategory[skill.category]) skillsByCategory[skill.category] = [];
      skillsByCategory[skill.category].push(skill);
    }

    // Connections count
    const connectionsCountRow = await dbGet(`
      SELECT COUNT(*) as cnt FROM connections 
      WHERE (requester_id = ? OR receiver_id = ?) AND status = 'accepted'
    `, [user.id, user.id]);
    const connectionsCount = connectionsCountRow ? connectionsCountRow.cnt : 0;

    // Approved Recommendations
    const recommendations = await dbAll(`
      SELECT r.*, u.username, p.site_title, p.avatar_url
      FROM recommendations r
      JOIN users u ON r.giver_id = u.id
      JOIN profiles p ON u.id = p.user_id
      WHERE r.receiver_id = ? AND r.status = 'accepted'
      ORDER BY r.created_at DESC
    `, [user.id]);

    res.render('public/about', {
      title: 'About | ' + (res.locals.settings.site_title || `${user.username} Portfolio`),
      experience,
      education,
      certificates,
      skills,
      skillsByCategory,
      connectionsCount,
      recommendations
    });
  } catch (err) {
    next(err);
  }
});

// ===== SOCIAL INTERACTIONS (REQUIRES LOGGED-IN ACCOUNT) =====

// Send connection request or follow
router.post('/:username/connect', async (req, res, next) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Please log in to make connections.' });
  const { username } = req.params;

  try {
    const receiver = await dbGet('SELECT id FROM users WHERE username = ?', [username.toLowerCase()]);
    if (!receiver) return res.status(404).json({ error: 'User not found' });
    if (receiver.id === req.session.userId) return res.status(400).json({ error: 'You cannot connect with yourself.' });

    // Check existing
    const existing = await dbGet(`
      SELECT * FROM connections 
      WHERE (requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?)
    `, [req.session.userId, receiver.id, receiver.id, req.session.userId]);

    if (existing) {
      return res.status(400).json({ error: 'Connection already exists or is pending.' });
    }

    await dbRun(
      'INSERT INTO connections (requester_id, receiver_id, status) VALUES (?, ?, "pending")',
      [req.session.userId, receiver.id]
    );

    // Activity logging
    await dbRun(
      'INSERT INTO activities (user_id, type, content) VALUES (?, "new_connection", ?)',
      [req.session.userId, `sent a connection request to @${username}`]
    );

    res.json({ success: 'Connection request sent.' });
  } catch (err) {
    next(err);
  }
});

// Endorse a skill
router.post('/:username/endorse', async (req, res, next) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Please log in to endorse skills.' });
  const { username } = req.params;
  const { skillId } = req.body;

  try {
    const receiver = await dbGet('SELECT id FROM users WHERE username = ?', [username.toLowerCase()]);
    if (!receiver) return res.status(404).json({ error: 'User not found' });
    if (receiver.id === req.session.userId) return res.status(400).json({ error: 'You cannot endorse your own skills.' });

    // Check if skill belongs to receiver
    const skill = await dbGet('SELECT id FROM skills WHERE id = ? AND user_id = ?', [skillId, receiver.id]);
    if (!skill) return res.status(400).json({ error: 'Invalid skill' });

    // Check if already endorsed
    const existing = await dbGet(
      'SELECT id FROM endorsements WHERE giver_id = ? AND receiver_id = ? AND skill_id = ?',
      [req.session.userId, receiver.id, skillId]
    );
    if (existing) {
      return res.status(400).json({ error: 'You have already endorsed this skill.' });
    }

    await dbRun(
      'INSERT INTO endorsements (giver_id, receiver_id, skill_id) VALUES (?, ?, ?)',
      [req.session.userId, receiver.id, skillId]
    );

    res.json({ success: 'Skill endorsed successfully.' });
  } catch (err) {
    next(err);
  }
});

// Write a recommendation
router.post('/:username/recommend', async (req, res, next) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Please log in to write recommendations.' });
  const { username } = req.params;
  const { content } = req.body;

  if (!content || content.trim().length < 10) {
    return res.status(400).json({ error: 'Recommendation content must be at least 10 characters long.' });
  }

  try {
    const receiver = await dbGet('SELECT id FROM users WHERE username = ?', [username.toLowerCase()]);
    if (!receiver) return res.status(404).json({ error: 'User not found' });
    if (receiver.id === req.session.userId) return res.status(400).json({ error: 'You cannot write a recommendation for yourself.' });

    await dbRun(
      'INSERT INTO recommendations (giver_id, receiver_id, content, status) VALUES (?, ?, ?, "pending")',
      [req.session.userId, receiver.id, content]
    );

    res.json({ success: 'Recommendation submitted for approval.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
