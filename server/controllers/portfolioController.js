const { dbGet, dbRun, dbAll } = require('../config/db');

const PortfolioController = {
  // ===== 1. GET PUBLIC PORTFOLIO BY USERNAME =====
  async getByUsername(req, res, next) {
    const username = req.params.username.toLowerCase();
    try {
      const user = await dbGet('SELECT id, username, email, created_at FROM users WHERE username = ? AND is_suspended = 0', [username]);
      if (!user) return res.status(404).json({ error: 'Developer profile not found' });

      const profile = await dbGet(
        `SELECT p.*, t.name as theme_name, t.config as theme_config 
         FROM profiles p 
         LEFT JOIN themes t ON p.theme_id = t.id 
         WHERE p.user_id = ?`, 
        [user.id]
      );

      if (!profile) return res.status(404).json({ error: 'Profile is not fully initialized' });
      if (profile.privacy_status === 'private') {
        return res.status(403).json({ error: 'This portfolio is marked as private' });
      }

      const settings = await dbGet('SELECT * FROM portfolio_settings WHERE user_id = ?', [user.id]) || {};
      const projects = await dbAll('SELECT * FROM projects WHERE user_id = ? ORDER BY sort_order ASC', [user.id]);
      const skills = await dbAll('SELECT * FROM skills WHERE user_id = ? ORDER BY sort_order ASC', [user.id]);
      const experience = await dbAll('SELECT * FROM experience WHERE user_id = ? ORDER BY sort_order ASC, start_date DESC', [user.id]);
      const education = await dbAll('SELECT * FROM education WHERE user_id = ? ORDER BY sort_order ASC, start_date DESC', [user.id]);
      const certificates = await dbAll('SELECT * FROM certificates WHERE user_id = ? ORDER BY sort_order ASC', [user.id]);
      const achievements = await dbAll('SELECT * FROM achievements WHERE user_id = ? ORDER BY sort_order ASC', [user.id]);
      const socialLinks = await dbAll('SELECT * FROM social_links WHERE user_id = ? ORDER BY sort_order ASC', [user.id]);
      const blogs = await dbAll('SELECT id, title, slug, excerpt, cover_image, tags, created_at FROM blogs WHERE user_id = ? AND published = 1 ORDER BY created_at DESC', [user.id]);
      
      const recommendations = await dbAll(
        `SELECT r.*, u.username as giver_username, u.email as giver_email 
         FROM recommendations r
         LEFT JOIN users u ON r.giver_id = u.id
         WHERE r.receiver_id = ? AND r.status = 'approved' 
         ORDER BY r.created_at DESC`, 
        [user.id]
      );

      // Counts
      const followersCount = (await dbGet('SELECT COUNT(*) as cnt FROM followers WHERE following_id = ?', [user.id])).cnt;
      const followingCount = (await dbGet('SELECT COUNT(*) as cnt FROM followers WHERE follower_id = ?', [user.id])).cnt;

      // Check if current requesting user is following this developer
      let isFollowing = false;
      if (req.user) {
        const followRecord = await dbGet('SELECT 1 FROM followers WHERE follower_id = ? AND following_id = ?', [req.user.id, user.id]);
        isFollowing = !!followRecord;
      }

      res.json({
        user: {
          id: user.id,
          username: user.username,
          created_at: user.created_at
        },
        profile,
        settings,
        projects,
        skills,
        experience,
        education,
        certificates,
        achievements,
        socialLinks,
        blogs,
        recommendations,
        isFollowing,
        followersCount,
        followingCount
      });
    } catch (err) {
      next(err);
    }
  },

  // ===== 2. POST VISITOR CONTACT MESSAGE =====
  async sendMessage(req, res, next) {
    const username = req.params.username.toLowerCase();
    const { name, email, subject, content } = req.body;

    if (!name || !email || !content) {
      return res.status(400).json({ error: 'Name, email, and content are required fields' });
    }

    try {
      const user = await dbGet('SELECT id FROM users WHERE username = ? AND is_suspended = 0', [username]);
      if (!user) return res.status(404).json({ error: 'Developer not found' });

      const settings = await dbGet('SELECT show_email_form FROM portfolio_settings WHERE user_id = ?', [user.id]);
      if (settings && settings.show_email_form === 0) {
        return res.status(400).json({ error: 'This developer has disabled direct messages.' });
      }

      const senderId = req.user ? req.user.id : null;

      await dbRun(
        `INSERT INTO messages (sender_id, receiver_id, sender_name, sender_email, subject, content) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [senderId, user.id, name, email, subject || '', content]
      );

      // Create notification for developer
      await dbRun(
        'INSERT INTO notifications (user_id, type, sender_id, content) VALUES (?, ?, ?, ?)',
        [user.id, 'message', senderId, `${name} sent you a new contact message.`]
      );

      res.status(201).json({ message: 'Your message has been sent successfully!' });
    } catch (err) {
      next(err);
    }
  },

  // ===== 3. GIVE RECOMMENDATION =====
  async giveRecommendation(req, res, next) {
    const username = req.params.username.toLowerCase();
    const { content } = req.body;
    const giverId = req.user.id; // Logged-in user giving the recommendation

    if (!content) return res.status(400).json({ error: 'Recommendation content is required' });

    try {
      const receiver = await dbGet('SELECT id, username FROM users WHERE username = ? AND is_suspended = 0', [username]);
      if (!receiver) return res.status(404).json({ error: 'Developer not found' });

      if (receiver.id === giverId) {
        return res.status(400).json({ error: 'You cannot recommend yourself.' });
      }

      const settings = await dbGet('SELECT allow_recommendations FROM portfolio_settings WHERE user_id = ?', [receiver.id]);
      if (settings && settings.allow_recommendations === 0) {
        return res.status(400).json({ error: 'This developer is not accepting recommendations.' });
      }

      const giverProfile = await dbGet('SELECT site_title, hero_subtitle FROM profiles WHERE user_id = ?', [giverId]);
      const giverName = req.user.username;
      const giverTitle = giverProfile ? (giverProfile.hero_subtitle || giverProfile.site_title) : 'Developer';

      await dbRun(
        `INSERT INTO recommendations (giver_id, receiver_id, giver_name, giver_title, content, status) 
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [giverId, receiver.id, giverName, giverTitle, content]
      );

      // Notify receiver
      await dbRun(
        'INSERT INTO notifications (user_id, type, sender_id, content) VALUES (?, ?, ?, ?)',
        [receiver.id, 'recommendation_request', giverId, `${giverName} submitted a recommendation for you.`]
      );

      res.status(201).json({ message: 'Recommendation submitted for approval.' });
    } catch (err) {
      next(err);
    }
  },

  // ===== 4. FOLLOW / UNFOLLOW =====
  async toggleFollow(req, res, next) {
    const username = req.params.username.toLowerCase();
    const followerId = req.user.id;

    try {
      const developer = await dbGet('SELECT id FROM users WHERE username = ? AND is_suspended = 0', [username]);
      if (!developer) return res.status(404).json({ error: 'Developer not found' });

      if (developer.id === followerId) {
        return res.status(400).json({ error: 'You cannot follow yourself.' });
      }

      const existingFollow = await dbGet('SELECT 1 FROM followers WHERE follower_id = ? AND following_id = ?', [followerId, developer.id]);
      
      if (existingFollow) {
        await dbRun('DELETE FROM followers WHERE follower_id = ? AND following_id = ?', [followerId, developer.id]);
        res.json({ followed: false, message: `Unfollowed ${username}` });
      } else {
        await dbRun('INSERT INTO followers (follower_id, following_id) VALUES (?, ?)', [followerId, developer.id]);
        
        // Notify
        await dbRun(
          'INSERT INTO notifications (user_id, type, sender_id, content) VALUES (?, ?, ?, ?)',
          [developer.id, 'follow', followerId, `${req.user.username} started following your portfolio.`]
        );
        res.json({ followed: true, message: `Followed ${username}` });
      }
    } catch (err) {
      next(err);
    }
  }
};

module.exports = PortfolioController;
