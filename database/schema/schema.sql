-- Schema for Career Showcase Platform (SQLite)
PRAGMA foreign_keys = ON;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user', -- 'super_admin', 'user'
    is_verified INTEGER DEFAULT 0,
    verification_token TEXT,
    reset_token TEXT,
    reset_token_expires TEXT,
    two_factor_secret TEXT,
    two_factor_enabled INTEGER DEFAULT 0,
    is_suspended INTEGER DEFAULT 0,
    gender TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2. Themes Table
CREATE TABLE IF NOT EXISTS themes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    config TEXT NOT NULL -- JSON configuration for styling
);

-- 3. Profiles Table
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
    accent_color TEXT DEFAULT '#3b82f6',
    accent_gradient TEXT DEFAULT 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    ring_color TEXT DEFAULT '#ffffff',
    footer_text TEXT,
    theme_id INTEGER REFERENCES themes(id) ON DELETE SET NULL,
    privacy_status TEXT DEFAULT 'public', -- 'public', 'private'
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 4. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    long_description TEXT,
    image_url TEXT,
    tech_stack TEXT, -- JSON Array of tech labels
    live_url TEXT,
    github_url TEXT,
    featured INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 5. Skills Table
CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- e.g. 'Frontend', 'Backend', 'DevOps', 'Design'
    proficiency INTEGER DEFAULT 50, -- Percentage
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 6. Experience Table
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
);

-- 7. Education Table
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
);

-- 8. Certificates Table
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
);

-- 9. Achievements Table
CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    date TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 10. Blogs Table
CREATE TABLE IF NOT EXISTS blogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    excerpt TEXT,
    content TEXT, -- Markdown content
    cover_image TEXT,
    tags TEXT, -- JSON Array
    published INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 11. Social Links Table
CREATE TABLE IF NOT EXISTS social_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL, -- 'github', 'linkedin', 'twitter', 'behance', 'dribbble', etc.
    url TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 12. Portfolio Settings Table
CREATE TABLE IF NOT EXISTS portfolio_settings (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    custom_domain TEXT UNIQUE,
    seo_title TEXT,
    seo_description TEXT,
    seo_keywords TEXT,
    open_graph_image TEXT,
    allow_recommendations INTEGER DEFAULT 1,
    show_email_form INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 13. Followers Table
CREATE TABLE IF NOT EXISTS followers (
    follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    following_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id)
);

-- 14. Recommendations Table
CREATE TABLE IF NOT EXISTS recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    giver_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    giver_name TEXT,
    giver_title TEXT,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 15. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'follow', 'recommendation_request', 'new_recommendation', 'message', 'system'
    sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 16. Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- NULL for anonymous visitor
    receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    sender_name TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    subject TEXT,
    content TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 17. Analytics Table
CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'page_view', 'project_click', 'resume_download'
    visitor_session_hash TEXT NOT NULL, -- Hashed IP + UA for privacy
    resource_id INTEGER, -- projectId, blogId, etc.
    referrer TEXT,
    browser TEXT,
    os TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 18. Sessions Table (for JWT Refresh Tokens)
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    refresh_token TEXT UNIQUE NOT NULL,
    user_agent TEXT,
    ip_address TEXT,
    is_revoked INTEGER DEFAULT 0,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 19. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- 'LOGIN_SUCCESS', 'UPDATE_PROFILE', 'DELETE_PROJECT', etc.
    details TEXT, -- JSON String with metadata
    ip_address TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
