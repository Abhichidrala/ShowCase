const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

// Rate limiter for registration & reset endpoints to prevent spamming
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5, // start blocking after 5 requests
  message: 'Too many accounts created from this IP. Please try again in an hour.',
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 3,
  message: 'Too many password reset requests. Please try again in 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Simple XSS cleaner helper to strip common scripts tags/inline events
function sanitizeInput(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/g, '')
    .replace(/on\w+='[^']*'/g, '')
    .replace(/javascript:[^"']*/g, '');
}

// Middleware to sanitize request body params
function xssSanitizer(req, res, next) {
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeInput(req.body[key]);
      } else if (Array.isArray(req.body[key])) {
        req.body[key] = req.body[key].map(item => (typeof item === 'string' ? sanitizeInput(item) : item));
      }
    }
  }
  next();
}

// Route-specific CSRF middleware to run after body parsing (e.g. multer)
function csrfCheck(req, res, next) {
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
  next();
}

module.exports = {
  registerLimiter,
  passwordResetLimiter,
  sanitizeInput,
  xssSanitizer,
  csrfCheck
};
