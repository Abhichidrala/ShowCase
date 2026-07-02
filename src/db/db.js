const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', '..', 'portfolio_saas.db');

// Ensure database file directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH);

// --- Promise Wrapper functions ---
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) {
    if (err) return reject(err);
    resolve({ id: this.lastID, changes: this.changes });
  });
});

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) return reject(err);
    resolve(row || null);
  });
});

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) return reject(err);
    resolve(rows || []);
  });
});

// --- Initialize Database Schema ---
async function initDb() {
  // Enforce foreign key constraints
  await dbRun('PRAGMA foreign_keys = ON;');

  // Users Table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      is_verified INTEGER DEFAULT 0,
      verification_token TEXT,
      reset_token TEXT,
      reset_token_expires TEXT,
      two_factor_secret TEXT,
      two_factor_enabled INTEGER DEFAULT 0,
      is_suspended INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Profiles Table (independent settings/meta config for portfolios)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS profiles (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      site_title TEXT,
      site_description TEXT,
      hero_title TEXT,
      hero_subtitle TEXT,
      hero_description TEXT,
      about_bio TEXT,
      avatar_url TEXT,
      resume_url TEXT,
      email TEXT,
      github_url TEXT,
      linkedin_url TEXT,
      twitter_url TEXT,
      accent_color TEXT DEFAULT '#ffffff',
      accent_gradient TEXT DEFAULT 'linear-gradient(135deg, #ffffff, #666666)',
      footer_text TEXT,
      theme_template TEXT DEFAULT 'classic-dark',
      privacy_status TEXT DEFAULT 'public',
      analytics_code TEXT,
      section_visibility TEXT DEFAULT '{"projects":true,"skills":true,"experience":true,"certificates":true,"blogs":true,"gallery":true,"education":true,"achievements":true}',
      custom_sections TEXT DEFAULT '[]'
    )
  `);

  // Projects Table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      long_description TEXT,
      image_url TEXT,
      tech_stack TEXT,
      live_url TEXT,
      github_url TEXT,
      featured INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Skills Table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      proficiency INTEGER DEFAULT 50,
      icon TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Experience Table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS experience (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      company TEXT NOT NULL,
      location TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT,
      description TEXT,
      is_current INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Education Table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS education (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      institution TEXT NOT NULL,
      degree TEXT,
      field_of_study TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Certificates Table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      issuer TEXT NOT NULL,
      issue_date TEXT,
      credential_url TEXT,
      image_url TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Blogs Table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS blogs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      excerpt TEXT,
      content TEXT,
      cover_image TEXT,
      tags TEXT,
      published INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Achievements Table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      date TEXT,
      sort_order INTEGER DEFAULT 0
    )
  `);

  // Gallery Table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS gallery (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title TEXT,
      image_url TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Connections Table (LinkedIn-style)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requester_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(requester_id, receiver_id)
    )
  `);

  // Endorsements Table (LinkedIn-style)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS endorsements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      giver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      skill_id INTEGER REFERENCES skills(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(giver_id, receiver_id, skill_id)
    )
  `);

  // Recommendations Table (LinkedIn-style with approval state)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS recommendations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      giver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'pending', -- 'pending', 'accepted'
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Activities Table (timeline feed generator)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL, -- 'project_added', 'blog_published', 'skill_added', 'certificate_added', 'new_connection'
      reference_id INTEGER,
      content TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Reports Table for Platform moderation
  await dbRun(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      reported_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'pending', -- 'pending', 'resolved'
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

module.exports = {
  db,
  dbRun,
  dbGet,
  dbAll,
  initDb
};
