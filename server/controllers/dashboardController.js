const slugify = require('slugify');
const { dbGet, dbRun, dbAll } = require('../config/db');
const { logAuditEvent } = require('../middleware/security');

const DashboardController = {
  // ===== 1. GET STATS SUMMARY =====
  async getSummary(req, res, next) {
    const userId = req.user.id;
    try {
      const stats = {
        projects: (await dbGet('SELECT COUNT(*) as cnt FROM projects WHERE user_id = ?', [userId])).cnt,
        skills: (await dbGet('SELECT COUNT(*) as cnt FROM skills WHERE user_id = ?', [userId])).cnt,
        experience: (await dbGet('SELECT COUNT(*) as cnt FROM experience WHERE user_id = ?', [userId])).cnt,
        certificates: (await dbGet('SELECT COUNT(*) as cnt FROM certificates WHERE user_id = ?', [userId])).cnt,
        blogs: (await dbGet('SELECT COUNT(*) as cnt FROM blogs WHERE user_id = ?', [userId])).cnt,
        followers: (await dbGet('SELECT COUNT(*) as cnt FROM followers WHERE following_id = ?', [userId])).cnt,
        messages: (await dbGet('SELECT COUNT(*) as cnt FROM messages WHERE receiver_id = ? AND is_read = 0', [userId])).cnt,
        recommendations: (await dbGet('SELECT COUNT(*) as cnt FROM recommendations WHERE receiver_id = ? AND status = "pending"', [userId])).cnt,
        pageViews: (await dbGet('SELECT COUNT(*) as cnt FROM analytics WHERE user_id = ? AND event_type = "page_view"', [userId])).cnt
      };
      res.json(stats);
    } catch (err) {
      next(err);
    }
  },

  // ===== 2. GET/UPDATE PROFILE =====
  async getProfile(req, res, next) {
    const userId = req.user.id;
    try {
      const profile = await dbGet('SELECT * FROM profiles WHERE user_id = ?', [userId]);
      const settings = await dbGet('SELECT * FROM portfolio_settings WHERE user_id = ?', [userId]);
      res.json({ profile, settings });
    } catch (err) {
      next(err);
    }
  },

  async updateProfile(req, res, next) {
    const userId = req.user.id;
    const { 
      site_title, site_description, hero_title, hero_subtitle, 
      hero_description, about_bio, email, accent_color, 
      accent_gradient, footer_text, privacy_status, theme_id 
    } = req.body;

    try {
      const avatar_url = req.file ? `/uploads/${req.file.filename}` : undefined;

      let query = `
        UPDATE profiles SET 
          site_title = ?, site_description = ?, hero_title = ?, 
          hero_subtitle = ?, hero_description = ?, about_bio = ?, 
          email = ?, accent_color = ?, accent_gradient = ?, 
          footer_text = ?, privacy_status = ?, theme_id = ?
      `;
      const params = [
        site_title, site_description, hero_title, hero_subtitle,
        hero_description, about_bio, email, accent_color, 
        accent_gradient, footer_text, privacy_status, theme_id || null
      ];

      if (avatar_url) {
        query += `, avatar_url = ?`;
        params.push(avatar_url);
      }

      query += ` WHERE user_id = ?`;
      params.push(userId);

      await dbRun(query, params);
      await logAuditEvent(userId, 'UPDATE_PROFILE', { site_title }, req.ip);

      const updatedProfile = await dbGet('SELECT * FROM profiles WHERE user_id = ?', [userId]);
      res.json({ message: 'Profile updated successfully', profile: updatedProfile });
    } catch (err) {
      next(err);
    }
  },

  // ===== 3. PROJECTS CRUD =====
  async getProjects(req, res, next) {
    const userId = req.user.id;
    try {
      const projects = await dbAll('SELECT * FROM projects WHERE user_id = ? ORDER BY sort_order ASC', [userId]);
      res.json(projects);
    } catch (err) {
      next(err);
    }
  },

  async createProject(req, res, next) {
    const userId = req.user.id;
    const { title, description, long_description, tech_stack, live_url, github_url, featured } = req.body;
    
    if (!title) return res.status(400).json({ error: 'Project title is required' });
    const slug = slugify(title, { lower: true, strict: true });

    try {
      const existing = await dbGet('SELECT id FROM projects WHERE user_id = ? AND slug = ?', [userId, slug]);
      if (existing) {
        return res.status(400).json({ error: 'A project with a similar title already exists.' });
      }

      const image_url = req.file ? `/uploads/${req.file.filename}` : '';
      let techArr = [];
      try {
        techArr = Array.isArray(tech_stack) ? tech_stack : (tech_stack ? JSON.parse(tech_stack) : []);
      } catch (e) {
        techArr = tech_stack.split(',').map(t => t.trim()).filter(Boolean);
      }

      const maxOrderRow = await dbGet('SELECT MAX(sort_order) as maxOrder FROM projects WHERE user_id = ?', [userId]);
      const sortOrder = (maxOrderRow ? maxOrderRow.maxOrder : 0) + 1;

      const result = await dbRun(
        `INSERT INTO projects (user_id, title, slug, description, long_description, image_url, tech_stack, live_url, github_url, featured, sort_order) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, title, slug, description || '', long_description || '', image_url, JSON.stringify(techArr), live_url || '', github_url || '', featured ? 1 : 0, sortOrder]
      );

      await logAuditEvent(userId, 'CREATE_PROJECT', { title, slug }, req.ip);
      res.status(201).json({ message: 'Project created successfully', projectId: result.id });
    } catch (err) {
      next(err);
    }
  },

  async updateProject(req, res, next) {
    const userId = req.user.id;
    const projectId = req.params.id;
    const { title, description, long_description, tech_stack, live_url, github_url, featured } = req.body;

    if (!title) return res.status(400).json({ error: 'Project title is required' });
    const slug = slugify(title, { lower: true, strict: true });

    try {
      const project = await dbGet('SELECT * FROM projects WHERE user_id = ? AND id = ?', [userId, projectId]);
      if (!project) return res.status(404).json({ error: 'Project not found' });

      let image_url = project.image_url;
      if (req.file) {
        image_url = `/uploads/${req.file.filename}`;
      }

      let techArr = [];
      try {
        techArr = Array.isArray(tech_stack) ? tech_stack : (tech_stack ? JSON.parse(tech_stack) : []);
      } catch (e) {
        techArr = tech_stack.split(',').map(t => t.trim()).filter(Boolean);
      }

      await dbRun(
        `UPDATE projects SET 
          title = ?, slug = ?, description = ?, long_description = ?, 
          image_url = ?, tech_stack = ?, live_url = ?, github_url = ?, featured = ? 
         WHERE user_id = ? AND id = ?`,
        [title, slug, description || '', long_description || '', image_url, JSON.stringify(techArr), live_url || '', github_url || '', featured ? 1 : 0, userId, projectId]
      );

      await logAuditEvent(userId, 'UPDATE_PROJECT', { title, projectId }, req.ip);
      res.json({ message: 'Project updated successfully' });
    } catch (err) {
      next(err);
    }
  },

  async deleteProject(req, res, next) {
    const userId = req.user.id;
    const projectId = req.params.id;

    try {
      const deleted = await dbRun('DELETE FROM projects WHERE user_id = ? AND id = ?', [userId, projectId]);
      if (deleted.changes === 0) return res.status(404).json({ error: 'Project not found' });

      await logAuditEvent(userId, 'DELETE_PROJECT', { projectId }, req.ip);
      res.json({ message: 'Project deleted successfully' });
    } catch (err) {
      next(err);
    }
  },

  // ===== 4. SKILLS CRUD =====
  async getSkills(req, res, next) {
    const userId = req.user.id;
    try {
      const skills = await dbAll('SELECT * FROM skills WHERE user_id = ? ORDER BY sort_order ASC', [userId]);
      res.json(skills);
    } catch (err) {
      next(err);
    }
  },

  async createSkill(req, res, next) {
    const userId = req.user.id;
    const { name, category, proficiency, icon } = req.body;
    if (!name || !category) return res.status(400).json({ error: 'Skill name and category are required' });

    try {
      const maxOrderRow = await dbGet('SELECT MAX(sort_order) as maxOrder FROM skills WHERE user_id = ?', [userId]);
      const sortOrder = (maxOrderRow ? maxOrderRow.maxOrder : 0) + 1;

      await dbRun(
        'INSERT INTO skills (user_id, name, category, proficiency, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, name, category, proficiency || 50, icon || '', sortOrder]
      );
      res.status(201).json({ message: 'Skill created successfully' });
    } catch (err) {
      next(err);
    }
  },

  async updateSkill(req, res, next) {
    const userId = req.user.id;
    const skillId = req.params.id;
    const { name, category, proficiency, icon } = req.body;

    try {
      const result = await dbRun(
        'UPDATE skills SET name = ?, category = ?, proficiency = ?, icon = ? WHERE user_id = ? AND id = ?',
        [name, category, proficiency || 50, icon || '', userId, skillId]
      );
      if (result.changes === 0) return res.status(404).json({ error: 'Skill not found' });
      res.json({ message: 'Skill updated successfully' });
    } catch (err) {
      next(err);
    }
  },

  async deleteSkill(req, res, next) {
    const userId = req.user.id;
    const skillId = req.params.id;
    try {
      const result = await dbRun('DELETE FROM skills WHERE user_id = ? AND id = ?', [userId, skillId]);
      if (result.changes === 0) return res.status(404).json({ error: 'Skill not found' });
      res.json({ message: 'Skill deleted' });
    } catch (err) {
      next(err);
    }
  },

  // ===== 5. EXPERIENCE CRUD =====
  async getExperience(req, res, next) {
    const userId = req.user.id;
    try {
      const experiences = await dbAll('SELECT * FROM experience WHERE user_id = ? ORDER BY sort_order ASC, start_date DESC', [userId]);
      res.json(experiences);
    } catch (err) {
      next(err);
    }
  },

  async createExperience(req, res, next) {
    const userId = req.user.id;
    const { role, company, location, start_date, end_date, description, is_current } = req.body;
    if (!role || !company || !start_date) return res.status(400).json({ error: 'Role, company, and start date are required' });

    try {
      const maxOrderRow = await dbGet('SELECT MAX(sort_order) as maxOrder FROM experience WHERE user_id = ?', [userId]);
      const sortOrder = (maxOrderRow ? maxOrderRow.maxOrder : 0) + 1;

      await dbRun(
        `INSERT INTO experience (user_id, role, company, location, start_date, end_date, description, is_current, sort_order) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, role, company, location || '', start_date, end_date || '', description || '', is_current ? 1 : 0, sortOrder]
      );
      res.status(201).json({ message: 'Experience added' });
    } catch (err) {
      next(err);
    }
  },

  async updateExperience(req, res, next) {
    const userId = req.user.id;
    const expId = req.params.id;
    const { role, company, location, start_date, end_date, description, is_current } = req.body;

    try {
      const result = await dbRun(
        `UPDATE experience SET role = ?, company = ?, location = ?, start_date = ?, end_date = ?, description = ?, is_current = ? 
         WHERE user_id = ? AND id = ?`,
        [role, company, location || '', start_date, end_date || '', description || '', is_current ? 1 : 0, userId, expId]
      );
      if (result.changes === 0) return res.status(404).json({ error: 'Experience not found' });
      res.json({ message: 'Experience updated' });
    } catch (err) {
      next(err);
    }
  },

  async deleteExperience(req, res, next) {
    const userId = req.user.id;
    const expId = req.params.id;
    try {
      const result = await dbRun('DELETE FROM experience WHERE user_id = ? AND id = ?', [userId, expId]);
      if (result.changes === 0) return res.status(404).json({ error: 'Experience not found' });
      res.json({ message: 'Experience deleted' });
    } catch (err) {
      next(err);
    }
  },

  // ===== 6. EDUCATION CRUD =====
  async getEducation(req, res, next) {
    const userId = req.user.id;
    try {
      const education = await dbAll('SELECT * FROM education WHERE user_id = ? ORDER BY sort_order ASC, start_date DESC', [userId]);
      res.json(education);
    } catch (err) {
      next(err);
    }
  },

  async createEducation(req, res, next) {
    const userId = req.user.id;
    const { institution, degree, field_of_study, start_date, end_date, description } = req.body;
    if (!institution || !start_date) return res.status(400).json({ error: 'Institution and start date are required' });

    try {
      const maxOrderRow = await dbGet('SELECT MAX(sort_order) as maxOrder FROM education WHERE user_id = ?', [userId]);
      const sortOrder = (maxOrderRow ? maxOrderRow.maxOrder : 0) + 1;

      await dbRun(
        `INSERT INTO education (user_id, institution, degree, field_of_study, start_date, end_date, description, sort_order) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, institution, degree || '', field_of_study || '', start_date, end_date || '', description || '', sortOrder]
      );
      res.status(201).json({ message: 'Education history created' });
    } catch (err) {
      next(err);
    }
  },

  async updateEducation(req, res, next) {
    const userId = req.user.id;
    const eduId = req.params.id;
    const { institution, degree, field_of_study, start_date, end_date, description } = req.body;

    try {
      const result = await dbRun(
        `UPDATE education SET institution = ?, degree = ?, field_of_study = ?, start_date = ?, end_date = ?, description = ? 
         WHERE user_id = ? AND id = ?`,
        [institution, degree || '', field_of_study || '', start_date, end_date || '', description || '', userId, eduId]
      );
      if (result.changes === 0) return res.status(404).json({ error: 'Education record not found' });
      res.json({ message: 'Education updated' });
    } catch (err) {
      next(err);
    }
  },

  async deleteEducation(req, res, next) {
    const userId = req.user.id;
    const eduId = req.params.id;
    try {
      const result = await dbRun('DELETE FROM education WHERE user_id = ? AND id = ?', [userId, eduId]);
      if (result.changes === 0) return res.status(404).json({ error: 'Education record not found' });
      res.json({ message: 'Education deleted' });
    } catch (err) {
      next(err);
    }
  },

  // ===== 7. CERTIFICATES CRUD =====
  async getCertificates(req, res, next) {
    const userId = req.user.id;
    try {
      const certs = await dbAll('SELECT * FROM certificates WHERE user_id = ? ORDER BY sort_order ASC', [userId]);
      res.json(certs);
    } catch (err) {
      next(err);
    }
  },

  async createCertificate(req, res, next) {
    const userId = req.user.id;
    const { title, issuer, issue_date, credential_url } = req.body;
    if (!title || !issuer) return res.status(400).json({ error: 'Title and issuer are required' });

    try {
      const image_url = req.file ? `/uploads/${req.file.filename}` : '';
      const maxOrderRow = await dbGet('SELECT MAX(sort_order) as maxOrder FROM certificates WHERE user_id = ?', [userId]);
      const sortOrder = (maxOrderRow ? maxOrderRow.maxOrder : 0) + 1;

      await dbRun(
        `INSERT INTO certificates (user_id, title, issuer, issue_date, credential_url, image_url, sort_order) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, title, issuer, issue_date || '', credential_url || '', image_url, sortOrder]
      );
      res.status(201).json({ message: 'Certificate created' });
    } catch (err) {
      next(err);
    }
  },

  async deleteCertificate(req, res, next) {
    const userId = req.user.id;
    const certId = req.params.id;
    try {
      const result = await dbRun('DELETE FROM certificates WHERE user_id = ? AND id = ?', [userId, certId]);
      if (result.changes === 0) return res.status(404).json({ error: 'Certificate not found' });
      res.json({ message: 'Certificate deleted' });
    } catch (err) {
      next(err);
    }
  },

  // ===== 8. SOCIAL LINKS CRUD =====
  async getSocialLinks(req, res, next) {
    const userId = req.user.id;
    try {
      const links = await dbAll('SELECT * FROM social_links WHERE user_id = ? ORDER BY sort_order ASC', [userId]);
      res.json(links);
    } catch (err) {
      next(err);
    }
  },

  async saveSocialLinks(req, res, next) {
    const userId = req.user.id;
    const { links } = req.body; // Array of { platform, url }
    if (!Array.isArray(links)) return res.status(400).json({ error: 'links must be an array' });

    try {
      await dbRun('DELETE FROM social_links WHERE user_id = ?', [userId]);
      let sortOrder = 1;
      for (const link of links) {
        if (link.platform && link.url) {
          await dbRun(
            'INSERT INTO social_links (user_id, platform, url, sort_order) VALUES (?, ?, ?, ?)',
            [userId, link.platform.toLowerCase(), link.url, sortOrder++]
          );
        }
      }
      res.json({ message: 'Social links updated' });
    } catch (err) {
      next(err);
    }
  },

  // ===== 9. PORTFOLIO SETTINGS (SEO, Custom Domain) =====
  async updateSettings(req, res, next) {
    const userId = req.user.id;
    const { custom_domain, seo_title, seo_description, seo_keywords, allow_recommendations, show_email_form } = req.body;

    try {
      const exists = await dbGet('SELECT user_id FROM portfolio_settings WHERE user_id = ?', [userId]);
      if (exists) {
        await dbRun(
          `UPDATE portfolio_settings SET 
            custom_domain = ?, seo_title = ?, seo_description = ?, 
            seo_keywords = ?, allow_recommendations = ?, show_email_form = ? 
           WHERE user_id = ?`,
          [
            custom_domain || null, seo_title || '', seo_description || '', 
            seo_keywords || '', allow_recommendations ? 1 : 0, show_email_form ? 1 : 0, 
            userId
          ]
        );
      } else {
        await dbRun(
          `INSERT INTO portfolio_settings (user_id, custom_domain, seo_title, seo_description, seo_keywords, allow_recommendations, show_email_form) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            userId, custom_domain || null, seo_title || '', seo_description || '', 
            seo_keywords || '', allow_recommendations ? 1 : 0, show_email_form ? 1 : 0
          ]
        );
      }
      res.json({ message: 'Portfolio settings updated successfully' });
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'This custom domain is already registered by another user.' });
      }
      next(err);
    }
  },

  // ===== 10. BLOGS CRUD =====
  async getBlogs(req, res, next) {
    const userId = req.user.id;
    try {
      const blogs = await dbAll('SELECT * FROM blogs WHERE user_id = ? ORDER BY created_at DESC', [userId]);
      res.json(blogs);
    } catch (err) {
      next(err);
    }
  },

  async createBlog(req, res, next) {
    const userId = req.user.id;
    const { title, excerpt, content, tags, published } = req.body;
    if (!title) return res.status(400).json({ error: 'Blog title is required' });
    const slug = slugify(title, { lower: true, strict: true });

    try {
      const cover_image = req.file ? `/uploads/${req.file.filename}` : '';
      let tagsArr = [];
      try {
        tagsArr = Array.isArray(tags) ? tags : (tags ? JSON.parse(tags) : []);
      } catch (e) {
        tagsArr = tags.split(',').map(t => t.trim()).filter(Boolean);
      }

      await dbRun(
        `INSERT INTO blogs (user_id, title, slug, excerpt, content, cover_image, tags, published) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, title, slug, excerpt || '', content || '', cover_image, JSON.stringify(tagsArr), published ? 1 : 0]
      );
      res.status(201).json({ message: 'Blog post created' });
    } catch (err) {
      next(err);
    }
  },

  async updateBlog(req, res, next) {
    const userId = req.user.id;
    const blogId = req.params.id;
    const { title, excerpt, content, tags, published } = req.body;

    if (!title) return res.status(400).json({ error: 'Blog title is required' });
    const slug = slugify(title, { lower: true, strict: true });

    try {
      const blog = await dbGet('SELECT * FROM blogs WHERE user_id = ? AND id = ?', [userId, blogId]);
      if (!blog) return res.status(404).json({ error: 'Blog not found' });

      let cover_image = blog.cover_image;
      if (req.file) {
        cover_image = `/uploads/${req.file.filename}`;
      }

      let tagsArr = [];
      try {
        tagsArr = Array.isArray(tags) ? tags : (tags ? JSON.parse(tags) : []);
      } catch (e) {
        tagsArr = tags.split(',').map(t => t.trim()).filter(Boolean);
      }

      await dbRun(
        `UPDATE blogs SET 
          title = ?, slug = ?, excerpt = ?, content = ?, 
          cover_image = ?, tags = ?, published = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = ? AND id = ?`,
        [title, slug, excerpt || '', content || '', cover_image, JSON.stringify(tagsArr), published ? 1 : 0, userId, blogId]
      );
      res.json({ message: 'Blog post updated' });
    } catch (err) {
      next(err);
    }
  },

  async deleteBlog(req, res, next) {
    const userId = req.user.id;
    const blogId = req.params.id;
    try {
      const result = await dbRun('DELETE FROM blogs WHERE user_id = ? AND id = ?', [userId, blogId]);
      if (result.changes === 0) return res.status(404).json({ error: 'Blog not found' });
      res.json({ message: 'Blog post deleted' });
    } catch (err) {
      next(err);
    }
  },

  // ===== 11. MESSAGES =====
  async getMessages(req, res, next) {
    const userId = req.user.id;
    try {
      const messages = await dbAll('SELECT * FROM messages WHERE receiver_id = ? ORDER BY created_at DESC', [userId]);
      res.json(messages);
    } catch (err) {
      next(err);
    }
  },

  async markMessageRead(req, res, next) {
    const userId = req.user.id;
    const messageId = req.params.id;
    try {
      await dbRun('UPDATE messages SET is_read = 1 WHERE receiver_id = ? AND id = ?', [userId, messageId]);
      res.json({ message: 'Message marked as read' });
    } catch (err) {
      next(err);
    }
  },

  async deleteMessage(req, res, next) {
    const userId = req.user.id;
    const messageId = req.params.id;
    try {
      await dbRun('DELETE FROM messages WHERE receiver_id = ? AND id = ?', [userId, messageId]);
      res.json({ message: 'Message deleted' });
    } catch (err) {
      next(err);
    }
  },

  // ===== 12. RECOMMENDATIONS =====
  async getRecommendations(req, res, next) {
    const userId = req.user.id;
    try {
      const list = await dbAll(
        `SELECT r.*, u.username as giver_username 
         FROM recommendations r
         LEFT JOIN users u ON r.giver_id = u.id
         WHERE r.receiver_id = ? ORDER BY r.created_at DESC`,
        [userId]
      );
      res.json(list);
    } catch (err) {
      next(err);
    }
  },

  async updateRecommendationStatus(req, res, next) {
    const userId = req.user.id;
    const recId = req.params.id;
    const { status } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    try {
      const result = await dbRun(
        'UPDATE recommendations SET status = ? WHERE receiver_id = ? AND id = ?',
        [status, userId, recId]
      );
      if (result.changes === 0) return res.status(404).json({ error: 'Recommendation not found' });
      res.json({ message: `Recommendation status updated to ${status}` });
    } catch (err) {
      next(err);
    }
  },

  // ===== 13. THEMES LIST & CUSTOMIZATION =====
  async getThemes(req, res, next) {
    try {
      const list = await dbAll('SELECT * FROM themes');
      res.json(list);
    } catch (err) {
      next(err);
    }
  },

  // ===== 14. ANALYTICS STATS =====
  async getAnalytics(req, res, next) {
    const userId = req.user.id;
    try {
      const dailyViews = await dbAll(
        `SELECT date(created_at) as date, count(*) as count 
         FROM analytics 
         WHERE user_id = ? AND event_type = 'page_view'
         GROUP BY date(created_at)
         ORDER BY date ASC LIMIT 30`,
        [userId]
      );

      const topProjects = await dbAll(
        `SELECT p.title, count(a.id) as clicks 
         FROM analytics a
         JOIN projects p ON a.resource_id = p.id
         WHERE a.user_id = ? AND a.event_type = 'project_click'
         GROUP BY p.id
         ORDER BY clicks DESC`,
        [userId]
      );

      const referrers = await dbAll(
        `SELECT referrer, count(*) as count 
         FROM analytics 
         WHERE user_id = ? AND referrer IS NOT NULL AND referrer != ''
         GROUP BY referrer
         ORDER BY count DESC LIMIT 10`,
        [userId]
      );

      const browsers = await dbAll(
        `SELECT browser, count(*) as count 
         FROM analytics 
         WHERE user_id = ?
         GROUP BY browser
         ORDER BY count DESC`,
        [userId]
      );

      res.json({
        dailyViews,
        topProjects,
        referrers,
        browsers
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = DashboardController;
