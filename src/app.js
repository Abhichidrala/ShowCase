require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const fs = require('fs');

const { initDb } = require('./db/db');
const { seed } = require('./db/seed_sqlite');
const { injectUser } = require('./middleware/auth');
const { xssSanitizer } = require('./middleware/security');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const superAdminRoutes = require('./routes/superAdmin');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// --- Security middleware ---
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"],
    }
  },
  crossOriginEmbedderPolicy: false,
}));

// --- Body parsing ---
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// Apply XSS sanitizer to all incoming posts
app.use(xssSanitizer);

// --- Static files ---
app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: 0 }));

// --- Session setup ---
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // set to true in production if HTTPS is active
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  },
  name: 'portfolio.sid'
}));

// --- View engine ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- Global template variables ---
app.use(injectUser);
app.use((req, res, next) => {
  // Default fallback site details
  res.locals.settings = {
    site_title: 'Showcase SaaS',
    site_description: 'Build your dynamic interactive developer portfolio showcase.',
    accent_color: '#ffffff',
    accent_gradient: 'linear-gradient(135deg, #ffffff, #666666)',
    footer_text: '© 2026 Showcase SaaS. Powered by creativity & code.'
  };
  res.locals.csrfToken = req.session ? (req.session.csrfToken || '') : '';
  next();
});

// --- CSRF protection ---
app.use((req, res, next) => {
  if (req.method === 'GET') {
    if (req.session && !req.session.csrfToken) {
      req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    res.locals.csrfToken = req.session ? req.session.csrfToken : '';
  }
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    // Skip validation for multipart/form-data because req.body is not parsed yet.
    // The CSRF token will be checked after multer middleware parses the body.
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      const token = req.body._csrf || req.headers['x-csrf-token'];
      if (!req.session || !token || token !== req.session.csrfToken) {
        return res.status(403).render('error', {
          title: 'Forbidden',
          message: 'Invalid or missing CSRF token. Please go back and try again.',
          code: 403
        });
      }
      req.session.csrfToken = crypto.randomBytes(32).toString('hex');
      res.locals.csrfToken = req.session.csrfToken;
    }
  }
  next();
});

// --- Rate limiting for login ---
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Too many login attempts. Please try again in 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/login', loginLimiter);

// --- Routes ---
app.use('/super-admin', superAdminRoutes);
app.use('/admin', adminRoutes);
app.use('/', publicRoutes);

// --- Error pages ---
app.use((req, res) => {
  res.status(404).render('error', {
    title: '404 — Page Not Found',
    message: "The page you're looking for doesn't exist or has been moved.",
    code: 404
  });
});

app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).render('error', {
    title: '500 — Server Error',
    message: 'Something went wrong on our end. Please try again later.',
    code: 500
  });
});

// --- Initialize DB, Seed and Start ---
(async () => {
  try {
    await initDb();
    await seed();
    app.listen(PORT, () => {
      console.log(`\n🚀 Showcase SaaS running at http://localhost:${PORT}`);
      console.log(`🔐 Personal Dashboards at http://localhost:${PORT}/admin`);
      console.log(`🛠️  Super Admin Panel at http://localhost:${PORT}/super-admin\n`);
    });
  } catch (err) {
    console.error('Database initialization failed:', err);
    process.exit(1);
  }
})();

