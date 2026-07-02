require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');

const { initDb } = require('./config/db');
const { apiLimiter, xssSanitizer } = require('./middleware/security');

// Import routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const portfoliosRoutes = require('./routes/portfolios');
const superAdminRoutes = require('./routes/superAdmin');
const publicRoutes = require('./routes/public');

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'uploads');
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
      connectSrc: ["'self'", CLIENT_URL],
    }
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS Configuration
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
app.use('/api', apiLimiter);

// --- Body parsing ---
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// Apply XSS sanitizer to all incoming request bodies
app.use(xssSanitizer);

// Zero-dependency cookie parser middleware
app.use((req, res, next) => {
  req.cookies = {};
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      const name = parts.shift().trim();
      const value = parts.join('=');
      try {
        req.cookies[name] = decodeURIComponent(value);
      } catch (e) {
        req.cookies[name] = value;
      }
    });
  }
  next();
});

// Serve uploaded files statically
app.use('/uploads', express.static(uploadDir, { maxAge: '1d' }));

// --- API Routing ---
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/portfolios', portfoliosRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api', publicRoutes);

// Error handlers
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(err.status || 500).json({ 
    error: err.message || 'Something went wrong on the server' 
  });
});

// --- Initialize Database & Start Server ---
(async () => {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`\n🚀 Career Showcase API Server running at http://localhost:${PORT}`);
      console.log(`📡 CORS configured for client at ${CLIENT_URL}`);
      console.log(`📂 Uploads served at http://localhost:${PORT}/uploads\n`);
    });
  } catch (err) {
    console.error('Database initialization failed:', err);
    process.exit(1);
  }
})();
