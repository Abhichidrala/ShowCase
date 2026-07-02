const crypto = require('crypto');
const { dbGet, dbRun, dbAll } = require('../config/db');

const PublicController = {
  // ===== 1. DISCOVER FEED =====
  async getDiscoverFeed(req, res, next) {
    try {
      // Latest active developers
      const developers = await dbAll(
        `SELECT u.username, p.site_title, p.hero_subtitle, p.avatar_url, p.about_bio, p.accent_color, p.accent_gradient
         FROM users u
         JOIN profiles p ON u.id = p.user_id
         WHERE u.is_suspended = 0 AND p.privacy_status = 'public'
         ORDER BY u.created_at DESC LIMIT 8`
      );

      // Featured projects
      const featuredProjects = await dbAll(
        `SELECT proj.*, u.username, prof.avatar_url 
         FROM projects proj
         JOIN users u ON proj.user_id = u.id
         JOIN profiles prof ON u.id = prof.user_id
         WHERE proj.featured = 1 AND prof.privacy_status = 'public' AND u.is_suspended = 0
         ORDER BY proj.created_at DESC LIMIT 6`
      );

      // Recent blog posts
      const recentBlogs = await dbAll(
        `SELECT b.title, b.slug, b.excerpt, b.cover_image, b.tags, b.created_at, u.username, prof.avatar_url 
         FROM blogs b
         JOIN users u ON b.user_id = u.id
         JOIN profiles prof ON u.id = prof.user_id
         WHERE b.published = 1 AND prof.privacy_status = 'public' AND u.is_suspended = 0
         ORDER BY b.created_at DESC LIMIT 6`
      );

      // Stats
      const stats = {
        users: (await dbGet('SELECT COUNT(*) as cnt FROM users WHERE is_suspended = 0')).cnt,
        projects: (await dbGet('SELECT COUNT(*) as cnt FROM projects')).cnt,
        blogs: (await dbGet('SELECT COUNT(*) as cnt FROM blogs WHERE published = 1')).cnt
      };

      res.json({
        developers,
        featuredProjects,
        recentBlogs,
        stats
      });
    } catch (err) {
      next(err);
    }
  },

  // ===== 2. SEARCH DEVELOPERS =====
  async search(req, res, next) {
    const query = (req.query.q || '').trim().toLowerCase();
    
    try {
      let developers;
      if (!query) {
        // Return random/latest developers if no search query
        developers = await dbAll(
          `SELECT u.username, p.site_title, p.hero_subtitle, p.avatar_url, p.about_bio, p.accent_color, p.accent_gradient
           FROM users u
           JOIN profiles p ON u.id = p.user_id
           WHERE u.is_suspended = 0 AND p.privacy_status = 'public'
           ORDER BY u.created_at DESC LIMIT 20`
        );
      } else {
        // Search by username, bio, skills, company
        developers = await dbAll(
          `SELECT DISTINCT u.username, p.site_title, p.hero_subtitle, p.avatar_url, p.about_bio, p.accent_color, p.accent_gradient
           FROM users u
           JOIN profiles p ON u.id = p.user_id
           LEFT JOIN skills s ON u.id = s.user_id
           LEFT JOIN experience e ON u.id = e.user_id
           WHERE u.is_suspended = 0 AND p.privacy_status = 'public'
             AND (u.username LIKE ? OR p.site_title LIKE ? OR p.about_bio LIKE ? OR s.name LIKE ? OR e.role LIKE ? OR e.company LIKE ?)`,
          Array(6).fill(`%${query}%`)
        );
      }

      res.json(developers);
    } catch (err) {
      next(err);
    }
  },

  // ===== 3. LIST BLOGS & SINGLE BLOG VIEW =====
  async getBlogs(req, res, next) {
    try {
      const blogs = await dbAll(
        `SELECT b.*, u.username, p.avatar_url 
         FROM blogs b
         JOIN users u ON b.user_id = u.id
         JOIN profiles p ON u.id = p.user_id
         WHERE b.published = 1 AND p.privacy_status = 'public' AND u.is_suspended = 0
         ORDER BY b.created_at DESC`
      );
      res.json(blogs);
    } catch (err) {
      next(err);
    }
  },

  async getBlogBySlug(req, res, next) {
    const { username, slug } = req.params;
    try {
      const user = await dbGet('SELECT id, username FROM users WHERE username = ? AND is_suspended = 0', [username.toLowerCase()]);
      if (!user) return res.status(404).json({ error: 'Developer not found' });

      const blog = await dbGet(
        'SELECT * FROM blogs WHERE user_id = ? AND slug = ? AND published = 1',
        [user.id, slug]
      );
      if (!blog) return res.status(404).json({ error: 'Blog post not found' });

      const profile = await dbGet('SELECT site_title, avatar_url FROM profiles WHERE user_id = ?', [user.id]);

      res.json({
        blog,
        developer: {
          username: user.username,
          site_title: profile ? profile.site_title : '',
          avatar_url: profile ? profile.avatar_url : ''
        }
      });
    } catch (err) {
      next(err);
    }
  },

  // ===== 4. TRACK ANALYTICS =====
  async trackAnalytics(req, res, next) {
    const { username, event_type, resource_id } = req.body;
    if (!username || !event_type) {
      return res.status(400).json({ error: 'Username and event_type are required' });
    }

    try {
      const user = await dbGet('SELECT id FROM users WHERE username = ? AND is_suspended = 0', [username.toLowerCase()]);
      if (!user) return res.status(404).json({ error: 'Developer not found' });

      const ip = req.ip || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'Unknown';
      const referrer = req.body.referrer || req.headers['referer'] || '';
      
      // Browser parsing
      let browser = 'Other';
      if (userAgent.includes('Chrome')) browser = 'Chrome';
      else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
      else if (userAgent.includes('Firefox')) browser = 'Firefox';
      else if (userAgent.includes('Edge')) browser = 'Edge';

      // OS parsing
      let os = 'Other';
      if (userAgent.includes('Windows')) os = 'Windows';
      else if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS')) os = 'macOS';
      else if (userAgent.includes('Linux')) os = 'Linux';
      else if (userAgent.includes('Android')) os = 'Android';
      else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

      // Hash ip + userAgent to identify unique visitor session hash without storing raw IP (privacy first!)
      const visitorSessionHash = crypto
        .createHash('sha256')
        .update(ip + userAgent + new Date().toDateString())
        .digest('hex');

      await dbRun(
        `INSERT INTO analytics (user_id, event_type, visitor_session_hash, resource_id, referrer, browser, os) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [user.id, event_type, visitorSessionHash, resource_id || null, referrer, browser, os]
      );

      res.sendStatus(204);
    } catch (err) {
      next(err);
    }
  }
};

module.exports = PublicController;
