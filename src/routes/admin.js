const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const slugify = require('slugify');
const { dbGet, dbRun, dbAll } = require('../db/db');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { generateSecret, verifyTOTP } = require('../utils/totp');
const { csrfCheck, xssSanitizer } = require('../middleware/security');

// ===== DASHBOARD SUMMARY =====
router.get('/', requireAuth, async (req, res, next) => {
  const userId = req.session.userId;
  try {
    const stats = {
      projects: (await dbGet('SELECT COUNT(*) as cnt FROM projects WHERE user_id = ?', [userId])).cnt,
      skills: (await dbGet('SELECT COUNT(*) as cnt FROM skills WHERE user_id = ?', [userId])).cnt,
      experience: (await dbGet('SELECT COUNT(*) as cnt FROM experience WHERE user_id = ?', [userId])).cnt,
      certificates: (await dbGet('SELECT COUNT(*) as cnt FROM certificates WHERE user_id = ?', [userId])).cnt,
      blogs: (await dbGet('SELECT COUNT(*) as cnt FROM blogs WHERE user_id = ?', [userId])).cnt,
      publishedBlogs: (await dbGet('SELECT COUNT(*) as cnt FROM blogs WHERE user_id = ? AND published = 1', [userId])).cnt,
      connections: (await dbGet('SELECT COUNT(*) as cnt FROM connections WHERE (requester_id = ? OR receiver_id = ?) AND status = "accepted"', [userId, userId])).cnt,
      pendingConnections: (await dbGet('SELECT COUNT(*) as cnt FROM connections WHERE receiver_id = ? AND status = "pending"', [userId])).cnt,
      pendingRecommendations: (await dbGet('SELECT COUNT(*) as cnt FROM recommendations WHERE receiver_id = ? AND status = "pending"', [userId])).cnt
    };

    res.render('admin/dashboard', {
      title: 'Dashboard | Admin',
      stats,
    });
  } catch (err) {
    next(err);
  }
});

// ===== PROJECTS CRUD =====
router.get('/projects', requireAuth, async (req, res, next) => {
  try {
    const projects = await dbAll('SELECT * FROM projects WHERE user_id = ? ORDER BY sort_order ASC', [req.session.userId]);
    res.render('admin/projects/index', { title: 'Manage Projects', projects, success: req.query.success });
  } catch (err) {
    next(err);
  }
});

router.get('/projects/new', requireAuth, (req, res) => {
  res.render('admin/projects/form', { title: 'New Project', project: null, error: null });
});

router.post('/projects', requireAuth, upload.single('image'), csrfCheck, xssSanitizer, async (req, res, next) => {
  const { title, description, long_description, tech_stack, live_url, github_url, featured } = req.body;
  const slug = slugify(title, { lower: true, strict: true });
  const userId = req.session.userId;

  try {
    const existing = await dbGet('SELECT id FROM projects WHERE user_id = ? AND slug = ?', [userId, slug]);
    if (existing) {
      return res.render('admin/projects/form', {
        title: 'New Project', project: req.body, error: 'A project with a similar title already exists.'
      });
    }

    const image_url = req.file ? '/uploads/' + req.file.filename : '';
    const techArr = tech_stack ? tech_stack.split(',').map(s => s.trim()).filter(Boolean) : [];
    const maxOrderRow = await dbGet('SELECT MAX(sort_order) as maxOrder FROM projects WHERE user_id = ?', [userId]);
    const sortOrder = (maxOrderRow ? maxOrderRow.maxOrder : 0) + 1;

    await dbRun(
      `INSERT INTO projects (user_id, title, slug, description, long_description, image_url, tech_stack, live_url, github_url, featured, sort_order) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, title, slug, description || '', long_description || '', image_url, JSON.stringify(techArr), live_url || '', github_url || '', featured ? 1 : 0, sortOrder]
    );

    // Track activity
    await dbRun(
      'INSERT INTO activities (user_id, type, content) VALUES (?, "project_added", ?)',
      [userId, `added a new project: "${title}"`]
    );

    res.redirect('/admin/projects?success=Project created');
  } catch (err) {
    next(err);
  }
});

router.get('/projects/:id/edit', requireAuth, async (req, res, next) => {
  try {
    const project = await dbGet('SELECT * FROM projects WHERE user_id = ? AND id = ?', [req.session.userId, req.params.id]);
    if (!project) return res.redirect('/admin/projects');
    try { project.tech_stack_str = JSON.parse(project.tech_stack).join(', '); } catch { project.tech_stack_str = ''; }
    res.render('admin/projects/form', { title: 'Edit Project', project, error: null });
  } catch (err) {
    next(err);
  }
});

router.post('/projects/:id', requireAuth, upload.single('image'), csrfCheck, xssSanitizer, async (req, res, next) => {
  const { title, description, long_description, tech_stack, live_url, github_url, featured } = req.body;
  const slug = slugify(title, { lower: true, strict: true });
  const userId = req.session.userId;
  const projectId = req.params.id;

  try {
    const existing = await dbGet('SELECT * FROM projects WHERE user_id = ? AND id = ?', [userId, projectId]);
    if (!existing) return res.redirect('/admin/projects');

    const image_url = req.file ? '/uploads/' + req.file.filename : existing.image_url;
    const techArr = tech_stack ? tech_stack.split(',').map(s => s.trim()).filter(Boolean) : [];

    await dbRun(
      `UPDATE projects 
       SET title = ?, slug = ?, description = ?, long_description = ?, image_url = ?, tech_stack = ?, live_url = ?, github_url = ?, featured = ?
       WHERE user_id = ? AND id = ?`,
      [title, slug, description || '', long_description || '', image_url, JSON.stringify(techArr), live_url || '', github_url || '', featured ? 1 : 0, userId, projectId]
    );

    res.redirect('/admin/projects?success=Project updated');
  } catch (err) {
    next(err);
  }
});

router.post('/projects/:id/delete', requireAuth, async (req, res, next) => {
  try {
    await dbRun('DELETE FROM projects WHERE user_id = ? AND id = ?', [req.session.userId, req.params.id]);
    res.redirect('/admin/projects?success=Project deleted');
  } catch (err) {
    next(err);
  }
});

// ===== SKILLS CRUD =====
router.get('/skills', requireAuth, async (req, res, next) => {
  try {
    const skills = await dbAll('SELECT * FROM skills WHERE user_id = ? ORDER BY sort_order ASC', [req.session.userId]);
    const categories = [...new Set(skills.map(s => s.category))];
    res.render('admin/skills/index', { title: 'Manage Skills', skills, categories, success: req.query.success });
  } catch (err) {
    next(err);
  }
});

router.get('/skills/new', requireAuth, (req, res) => {
  res.render('admin/skills/form', { title: 'New Skill', skill: null, error: null });
});

router.post('/skills', requireAuth, async (req, res, next) => {
  const { name, category, proficiency, icon } = req.body;
  const userId = req.session.userId;

  try {
    const maxOrderRow = await dbGet('SELECT MAX(sort_order) as maxOrder FROM skills WHERE user_id = ?', [userId]);
    const sortOrder = (maxOrderRow ? maxOrderRow.maxOrder : 0) + 1;

    await dbRun(
      'INSERT INTO skills (user_id, name, category, proficiency, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, name, category || 'General', parseInt(proficiency) || 50, icon || '', sortOrder]
    );

    res.redirect('/admin/skills?success=Skill added');
  } catch (err) {
    next(err);
  }
});

router.get('/skills/:id/edit', requireAuth, async (req, res, next) => {
  try {
    const skill = await dbGet('SELECT * FROM skills WHERE user_id = ? AND id = ?', [req.session.userId, req.params.id]);
    if (!skill) return res.redirect('/admin/skills');
    res.render('admin/skills/form', { title: 'Edit Skill', skill, error: null });
  } catch (err) {
    next(err);
  }
});

router.post('/skills/:id', requireAuth, async (req, res, next) => {
  const { name, category, proficiency, icon } = req.body;
  try {
    await dbRun(
      'UPDATE skills SET name = ?, category = ?, proficiency = ?, icon = ? WHERE user_id = ? AND id = ?',
      [name, category || 'General', parseInt(proficiency) || 50, icon || '', req.session.userId, req.params.id]
    );
    res.redirect('/admin/skills?success=Skill updated');
  } catch (err) {
    next(err);
  }
});

router.post('/skills/:id/delete', requireAuth, async (req, res, next) => {
  try {
    await dbRun('DELETE FROM skills WHERE user_id = ? AND id = ?', [req.session.userId, req.params.id]);
    res.redirect('/admin/skills?success=Skill deleted');
  } catch (err) {
    next(err);
  }
});

// ===== EXPERIENCE CRUD =====
router.get('/experience', requireAuth, async (req, res, next) => {
  try {
    const experience = await dbAll('SELECT * FROM experience WHERE user_id = ? ORDER BY sort_order ASC', [req.session.userId]);
    res.render('admin/experience/index', { title: 'Manage Experience', experience, success: req.query.success });
  } catch (err) {
    next(err);
  }
});

router.get('/experience/new', requireAuth, (req, res) => {
  res.render('admin/experience/form', { title: 'New Experience', exp: null, error: null });
});

router.post('/experience', requireAuth, async (req, res, next) => {
  const { role, company, location, start_date, end_date, description, is_current } = req.body;
  const userId = req.session.userId;

  try {
    const maxOrderRow = await dbGet('SELECT MAX(sort_order) as maxOrder FROM experience WHERE user_id = ?', [userId]);
    const sortOrder = (maxOrderRow ? maxOrderRow.maxOrder : 0) + 1;

    await dbRun(
      `INSERT INTO experience (user_id, role, company, location, start_date, end_date, description, is_current, sort_order) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, role, company, location || '', start_date, is_current ? '' : (end_date || ''), description || '', is_current ? 1 : 0, sortOrder]
    );

    res.redirect('/admin/experience?success=Experience added');
  } catch (err) {
    next(err);
  }
});

router.get('/experience/:id/edit', requireAuth, async (req, res, next) => {
  try {
    const exp = await dbGet('SELECT * FROM experience WHERE user_id = ? AND id = ?', [req.session.userId, req.params.id]);
    if (!exp) return res.redirect('/admin/experience');
    res.render('admin/experience/form', { title: 'Edit Experience', exp, error: null });
  } catch (err) {
    next(err);
  }
});

router.post('/experience/:id', requireAuth, async (req, res, next) => {
  const { role, company, location, start_date, end_date, description, is_current } = req.body;
  try {
    await dbRun(
      `UPDATE experience 
       SET role = ?, company = ?, location = ?, start_date = ?, end_date = ?, description = ?, is_current = ?
       WHERE user_id = ? AND id = ?`,
      [role, company, location || '', start_date, is_current ? '' : (end_date || ''), description || '', is_current ? 1 : 0, req.session.userId, req.params.id]
    );
    res.redirect('/admin/experience?success=Experience updated');
  } catch (err) {
    next(err);
  }
});

router.post('/experience/:id/delete', requireAuth, async (req, res, next) => {
  try {
    await dbRun('DELETE FROM experience WHERE user_id = ? AND id = ?', [req.session.userId, req.params.id]);
    res.redirect('/admin/experience?success=Experience deleted');
  } catch (err) {
    next(err);
  }
});

// ===== EDUCATION CRUD =====
router.get('/education', requireAuth, async (req, res, next) => {
  try {
    const education = await dbAll('SELECT * FROM education WHERE user_id = ? ORDER BY sort_order ASC', [req.session.userId]);
    res.render('admin/education/index', { title: 'Manage Education', education, success: req.query.success });
  } catch (err) {
    next(err);
  }
});

router.get('/education/new', requireAuth, (req, res) => {
  res.render('admin/education/form', { title: 'New Education', edu: null, error: null });
});

router.post('/education', requireAuth, async (req, res, next) => {
  const { institution, degree, field_of_study, start_date, end_date, description } = req.body;
  const userId = req.session.userId;

  try {
    const maxOrderRow = await dbGet('SELECT MAX(sort_order) as maxOrder FROM education WHERE user_id = ?', [userId]);
    const sortOrder = (maxOrderRow ? maxOrderRow.maxOrder : 0) + 1;

    await dbRun(
      `INSERT INTO education (user_id, institution, degree, field_of_study, start_date, end_date, description, sort_order) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, institution, degree || '', field_of_study || '', start_date, end_date || '', description || '', sortOrder]
    );

    res.redirect('/admin/education?success=Education added');
  } catch (err) {
    next(err);
  }
});

router.get('/education/:id/edit', requireAuth, async (req, res, next) => {
  try {
    const edu = await dbGet('SELECT * FROM education WHERE user_id = ? AND id = ?', [req.session.userId, req.params.id]);
    if (!edu) return res.redirect('/admin/education');
    res.render('admin/education/form', { title: 'Edit Education', edu, error: null });
  } catch (err) {
    next(err);
  }
});

router.post('/education/:id', requireAuth, async (req, res, next) => {
  const { institution, degree, field_of_study, start_date, end_date, description } = req.body;
  try {
    await dbRun(
      `UPDATE education 
       SET institution = ?, degree = ?, field_of_study = ?, start_date = ?, end_date = ?, description = ?
       WHERE user_id = ? AND id = ?`,
      [institution, degree || '', field_of_study || '', start_date, end_date || '', description || '', req.session.userId, req.params.id]
    );
    res.redirect('/admin/education?success=Education updated');
  } catch (err) {
    next(err);
  }
});

router.post('/education/:id/delete', requireAuth, async (req, res, next) => {
  try {
    await dbRun('DELETE FROM education WHERE user_id = ? AND id = ?', [req.session.userId, req.params.id]);
    res.redirect('/admin/education?success=Education deleted');
  } catch (err) {
    next(err);
  }
});

// ===== CERTIFICATES CRUD =====
router.get('/certificates', requireAuth, async (req, res, next) => {
  try {
    const certificates = await dbAll('SELECT * FROM certificates WHERE user_id = ? ORDER BY sort_order ASC', [req.session.userId]);
    res.render('admin/certificates/index', { title: 'Manage Certificates', certificates, success: req.query.success });
  } catch (err) {
    next(err);
  }
});

router.get('/certificates/new', requireAuth, (req, res) => {
  res.render('admin/certificates/form', { title: 'New Certificate', cert: null, error: null });
});

router.post('/certificates', requireAuth, upload.single('image'), csrfCheck, xssSanitizer, async (req, res, next) => {
  const { title, issuer, issue_date, credential_url } = req.body;
  const userId = req.session.userId;

  try {
    const image_url = req.file ? '/uploads/' + req.file.filename : '';
    const maxOrderRow = await dbGet('SELECT MAX(sort_order) as maxOrder FROM certificates WHERE user_id = ?', [userId]);
    const sortOrder = (maxOrderRow ? maxOrderRow.maxOrder : 0) + 1;

    await dbRun(
      `INSERT INTO certificates (user_id, title, issuer, issue_date, credential_url, image_url, sort_order) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, title, issuer || '', issue_date || '', credential_url || '', image_url, sortOrder]
    );

    // Track activity
    await dbRun(
      'INSERT INTO activities (user_id, type, content) VALUES (?, "certificate_added", ?)',
      [userId, `earned a certificate: "${title}" from ${issuer}`]
    );

    res.redirect('/admin/certificates?success=Certificate added');
  } catch (err) {
    next(err);
  }
});

router.get('/certificates/:id/edit', requireAuth, async (req, res, next) => {
  try {
    const cert = await dbGet('SELECT * FROM certificates WHERE user_id = ? AND id = ?', [req.session.userId, req.params.id]);
    if (!cert) return res.redirect('/admin/certificates');
    res.render('admin/certificates/form', { title: 'Edit Certificate', cert, error: null });
  } catch (err) {
    next(err);
  }
});

router.post('/certificates/:id', requireAuth, upload.single('image'), csrfCheck, xssSanitizer, async (req, res, next) => {
  const { title, issuer, issue_date, credential_url } = req.body;
  const userId = req.session.userId;
  const certId = req.params.id;

  try {
    const existing = await dbGet('SELECT image_url FROM certificates WHERE user_id = ? AND id = ?', [userId, certId]);
    if (!existing) return res.redirect('/admin/certificates');

    const image_url = req.file ? '/uploads/' + req.file.filename : existing.image_url;

    await dbRun(
      `UPDATE certificates 
       SET title = ?, issuer = ?, issue_date = ?, credential_url = ?, image_url = ?
       WHERE user_id = ? AND id = ?`,
      [title, issuer || '', issue_date || '', credential_url || '', image_url, userId, certId]
    );

    res.redirect('/admin/certificates?success=Certificate updated');
  } catch (err) {
    next(err);
  }
});

router.post('/certificates/:id/delete', requireAuth, async (req, res, next) => {
  try {
    await dbRun('DELETE FROM certificates WHERE user_id = ? AND id = ?', [req.session.userId, req.params.id]);
    res.redirect('/admin/certificates?success=Certificate deleted');
  } catch (err) {
    next(err);
  }
});

// ===== GALLERY CRUD =====
router.get('/gallery', requireAuth, async (req, res, next) => {
  try {
    const items = await dbAll('SELECT * FROM gallery WHERE user_id = ? ORDER BY created_at DESC', [req.session.userId]);
    res.render('admin/gallery/index', { title: 'Manage Portfolio Gallery', items, success: req.query.success });
  } catch (err) {
    next(err);
  }
});

router.post('/gallery', requireAuth, upload.single('image'), csrfCheck, xssSanitizer, async (req, res, next) => {
  const { title } = req.body;
  const userId = req.session.userId;

  if (!req.file) {
    return res.redirect('/admin/gallery?error=Please select an image file to upload.');
  }

  try {
    const image_url = '/uploads/' + req.file.filename;
    await dbRun(
      'INSERT INTO gallery (user_id, title, image_url) VALUES (?, ?, ?)',
      [userId, title || '', image_url]
    );

    res.redirect('/admin/gallery?success=Image added to gallery');
  } catch (err) {
    next(err);
  }
});

router.post('/gallery/:id/delete', requireAuth, async (req, res, next) => {
  try {
    await dbRun('DELETE FROM gallery WHERE user_id = ? AND id = ?', [req.session.userId, req.params.id]);
    res.redirect('/admin/gallery?success=Gallery item deleted');
  } catch (err) {
    next(err);
  }
});

// ===== BLOGS CRUD =====
router.get('/blogs', requireAuth, async (req, res, next) => {
  try {
    const blogs = await dbAll('SELECT * FROM blogs WHERE user_id = ? ORDER BY created_at DESC', [req.session.userId]);
    res.render('admin/blogs/index', { title: 'Manage Blogs', blogs, success: req.query.success });
  } catch (err) {
    next(err);
  }
});

router.get('/blogs/new', requireAuth, (req, res) => {
  res.render('admin/blogs/form', { title: 'New Blog Post', blog: null, error: null });
});

router.post('/blogs', requireAuth, upload.single('cover_image'), csrfCheck, xssSanitizer, async (req, res, next) => {
  const { title, excerpt, content, tags, published } = req.body;
  const slug = slugify(title, { lower: true, strict: true });
  const userId = req.session.userId;

  try {
    const existing = await dbGet('SELECT id FROM blogs WHERE user_id = ? AND slug = ?', [userId, slug]);
    if (existing) {
      return res.render('admin/blogs/form', {
        title: 'New Blog Post', blog: req.body, error: 'A blog post with a similar title already exists.'
      });
    }

    const cover_image = req.file ? '/uploads/' + req.file.filename : '';
    const tagsArr = tags ? tags.split(',').map(s => s.trim()).filter(Boolean) : [];
    const now = new Date().toISOString();

    await dbRun(
      `INSERT INTO blogs (user_id, title, slug, excerpt, content, cover_image, tags, published, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, title, slug, excerpt || '', content || '', cover_image, JSON.stringify(tagsArr), published ? 1 : 0, now, now]
    );

    // Track activity
    if (published) {
      await dbRun(
        'INSERT INTO activities (user_id, type, content) VALUES (?, "blog_published", ?)',
        [userId, `published a new blog post: "${title}"`]
      );
    }

    res.redirect('/admin/blogs?success=Blog post created');
  } catch (err) {
    next(err);
  }
});

router.get('/blogs/:id/edit', requireAuth, async (req, res, next) => {
  try {
    const blog = await dbGet('SELECT * FROM blogs WHERE user_id = ? AND id = ?', [req.session.userId, req.params.id]);
    if (!blog) return res.redirect('/admin/blogs');
    try { blog.tags_str = JSON.parse(blog.tags).join(', '); } catch { blog.tags_str = ''; }
    res.render('admin/blogs/form', { title: 'Edit Blog Post', blog, error: null });
  } catch (err) {
    next(err);
  }
});

router.post('/blogs/:id', requireAuth, upload.single('cover_image'), csrfCheck, xssSanitizer, async (req, res, next) => {
  const { title, excerpt, content, tags, published } = req.body;
  const slug = slugify(title, { lower: true, strict: true });
  const userId = req.session.userId;
  const blogId = req.params.id;

  try {
    const existing = await dbGet('SELECT cover_image FROM blogs WHERE user_id = ? AND id = ?', [userId, blogId]);
    if (!existing) return res.redirect('/admin/blogs');

    const cover_image = req.file ? '/uploads/' + req.file.filename : existing.cover_image;
    const tagsArr = tags ? tags.split(',').map(s => s.trim()).filter(Boolean) : [];

    await dbRun(
      `UPDATE blogs 
       SET title = ?, slug = ?, excerpt = ?, content = ?, cover_image = ?, tags = ?, published = ?, updated_at = ?
       WHERE user_id = ? AND id = ?`,
      [title, slug, excerpt || '', content || '', cover_image, JSON.stringify(tagsArr), published ? 1 : 0, new Date().toISOString(), userId, blogId]
    );

    res.redirect('/admin/blogs?success=Blog post updated');
  } catch (err) {
    next(err);
  }
});

router.post('/blogs/:id/delete', requireAuth, async (req, res, next) => {
  try {
    await dbRun('DELETE FROM blogs WHERE user_id = ? AND id = ?', [req.session.userId, req.params.id]);
    res.redirect('/admin/blogs?success=Blog post deleted');
  } catch (err) {
    next(err);
  }
});

// ===== SETTINGS & PROFILE =====
router.get('/settings', requireAuth, async (req, res, next) => {
  try {
    const profile = await dbGet('SELECT * FROM profiles WHERE user_id = ?', [req.session.userId]);
    const user = await dbGet('SELECT username, email, two_factor_enabled FROM users WHERE id = ?', [req.session.userId]);
    res.render('admin/settings', { 
      title: 'Site Settings', 
      settings: profile || {}, 
      user,
      success: req.query.success,
      error: req.query.error,
      totp: req.session.totpSetup || null
    });
  } catch (err) {
    next(err);
  }
});

router.post('/settings', requireAuth, async (req, res, next) => {
  const fields = [
    'site_title', 'site_description', 'hero_title', 'hero_subtitle', 'hero_description',
    'about_bio', 'avatar_url', 'resume_url', 'email',
    'github_url', 'linkedin_url', 'twitter_url',
    'accent_color', 'accent_gradient', 'footer_text', 'theme_template', 'privacy_status', 'analytics_code'
  ];
  
  const userId = req.session.userId;
  const updates = [];
  const params = [];

  for (const field of fields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(req.body[field]);
    }
  }

  if (updates.length === 0) return res.redirect('/admin/settings');

  params.push(userId);

  try {
    await dbRun(
      `UPDATE profiles SET ${updates.join(', ')} WHERE user_id = ?`,
      params
    );
    res.redirect('/admin/settings?success=Settings saved');
  } catch (err) {
    next(err);
  }
});

// ===== CHANGE PASSWORD =====
router.post('/change-password', requireAuth, async (req, res, next) => {
  const { current_password, new_password, confirm_password } = req.body;
  const userId = req.session.userId;

  try {
    const user = await dbGet('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (!bcrypt.compareSync(current_password, user.password_hash)) {
      return res.redirect('/admin/settings?error=Current password is incorrect');
    }
    if (new_password.length < 6) {
      return res.redirect('/admin/settings?error=New password must be at least 6 characters');
    }
    if (new_password !== confirm_password) {
      return res.redirect('/admin/settings?error=Passwords do not match');
    }

    const hash = bcrypt.hashSync(new_password, 12);
    await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);
    res.redirect('/admin/settings?success=Password changed successfully');
  } catch (err) {
    next(err);
  }
});

// ===== TWO FACTOR AUTH SETUP =====
router.post('/2fa/setup', requireAuth, async (req, res, next) => {
  const userId = req.session.userId;
  try {
    const user = await dbGet('SELECT username FROM users WHERE id = ?', [userId]);
    const { secret, otpauthUrl } = generateSecret(user.username);
    
    // Save generated secret in session temporarily
    req.session.totpSetup = { secret, otpauthUrl };
    res.redirect('/admin/settings?success=2FA configured. Verify token to enable.');
  } catch (err) {
    next(err);
  }
});

router.post('/2fa/verify', requireAuth, async (req, res, next) => {
  const { token } = req.body;
  const userId = req.session.userId;

  if (!req.session.totpSetup) {
    return res.redirect('/admin/settings?error=2FA setup was not initiated.');
  }

  const { secret } = req.session.totpSetup;
  const isValid = verifyTOTP(token, secret);

  if (!isValid) {
    return res.redirect('/admin/settings?error=Invalid token. Please verify code again.');
  }

  try {
    await dbRun(
      'UPDATE users SET two_factor_secret = ?, two_factor_enabled = 1 WHERE id = ?',
      [secret, userId]
    );
    delete req.session.totpSetup;
    res.redirect('/admin/settings?success=Two-factor authentication enabled successfully.');
  } catch (err) {
    next(err);
  }
});

router.post('/2fa/disable', requireAuth, async (req, res, next) => {
  const { token } = req.body;
  const userId = req.session.userId;

  try {
    const user = await dbGet('SELECT two_factor_secret FROM users WHERE id = ?', [userId]);
    const isValid = verifyTOTP(token, user.two_factor_secret);
    
    if (!isValid) {
      return res.redirect('/admin/settings?error=Invalid token. Could not disable 2FA.');
    }

    await dbRun(
      'UPDATE users SET two_factor_secret = NULL, two_factor_enabled = 0 WHERE id = ?',
      [userId]
    );
    res.redirect('/admin/settings?success=Two-factor authentication disabled.');
  } catch (err) {
    next(err);
  }
});

// ===== CONNECTIONS (SOCIAL MANAGEMENT) =====
router.get('/connections', requireAuth, async (req, res, next) => {
  const userId = req.session.userId;
  try {
    // List incoming connection requests
    const pendingRequests = await dbAll(`
      SELECT c.id, u.username, p.site_title, p.avatar_url 
      FROM connections c
      JOIN users u ON c.requester_id = u.id
      JOIN profiles p ON u.id = p.user_id
      WHERE c.receiver_id = ? AND c.status = "pending"
    `, [userId]);

    // List active connections
    const connections = await dbAll(`
      SELECT c.id, u.username, p.site_title, p.avatar_url 
      FROM connections c
      JOIN users u ON (c.requester_id = u.id AND c.receiver_id = ?) OR (c.receiver_id = u.id AND c.requester_id = ?)
      JOIN profiles p ON u.id = p.user_id
      WHERE c.status = "accepted" AND u.id != ?
    `, [userId, userId, userId]);

    res.render('admin/connections/index', { title: 'Manage Connections', pendingRequests, connections, success: req.query.success });
  } catch (err) {
    next(err);
  }
});

router.post('/connections/:id/accept', requireAuth, async (req, res, next) => {
  const userId = req.session.userId;
  const connId = req.params.id;

  try {
    // Verify connection target is current user
    const conn = await dbGet('SELECT * FROM connections WHERE id = ? AND receiver_id = ?', [connId, userId]);
    if (!conn) return res.redirect('/admin/connections?error=Request not found');

    await dbRun('UPDATE connections SET status = "accepted" WHERE id = ?', [connId]);
    
    // Log active connection in activities
    const requester = await dbGet('SELECT username FROM users WHERE id = ?', [conn.requester_id]);
    await dbRun(
      'INSERT INTO activities (user_id, type, content) VALUES (?, "new_connection", ?)',
      [userId, `became connected with @${requester ? requester.username : 'someone'}`]
    );

    res.redirect('/admin/connections?success=Connection request accepted.');
  } catch (err) {
    next(err);
  }
});

router.post('/connections/:id/reject', requireAuth, async (req, res, next) => {
  const userId = req.session.userId;
  const connId = req.params.id;

  try {
    await dbRun('DELETE FROM connections WHERE id = ? AND (receiver_id = ? OR requester_id = ?)', [connId, userId, userId]);
    res.redirect('/admin/connections?success=Connection request declined.');
  } catch (err) {
    next(err);
  }
});

// ===== RECOMMENDATIONS APPROVAL =====
router.get('/recommendations', requireAuth, async (req, res, next) => {
  const userId = req.session.userId;
  try {
    const pending = await dbAll(`
      SELECT r.id, r.content, r.created_at, u.username, p.site_title, p.avatar_url
      FROM recommendations r
      JOIN users u ON r.giver_id = u.id
      JOIN profiles p ON u.id = p.user_id
      WHERE r.receiver_id = ? AND r.status = "pending"
    `, [userId]);

    const approved = await dbAll(`
      SELECT r.id, r.content, r.created_at, u.username, p.site_title, p.avatar_url
      FROM recommendations r
      JOIN users u ON r.giver_id = u.id
      JOIN profiles p ON u.id = p.user_id
      WHERE r.receiver_id = ? AND r.status = "accepted"
    `, [userId]);

    res.render('admin/recommendations/index', { title: 'Manage Recommendations', pending, approved, success: req.query.success });
  } catch (err) {
    next(err);
  }
});

router.post('/recommendations/:id/approve', requireAuth, async (req, res, next) => {
  const userId = req.session.userId;
  const recId = req.params.id;

  try {
    const rec = await dbGet('SELECT * FROM recommendations WHERE id = ? AND receiver_id = ?', [recId, userId]);
    if (!rec) return res.redirect('/admin/recommendations?error=Recommendation not found');

    await dbRun('UPDATE recommendations SET status = "accepted" WHERE id = ?', [recId]);
    res.redirect('/admin/recommendations?success=Recommendation approved and is now visible on your public portfolio.');
  } catch (err) {
    next(err);
  }
});

router.post('/recommendations/:id/delete', requireAuth, async (req, res, next) => {
  const userId = req.session.userId;
  try {
    await dbRun('DELETE FROM recommendations WHERE id = ? AND (receiver_id = ? OR giver_id = ?)', [req.params.id, userId, userId]);
    res.redirect('/admin/recommendations?success=Recommendation removed.');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
