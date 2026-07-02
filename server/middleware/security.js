const rateLimit = require('express-rate-limit');
const { dbRun } = require('../config/db');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 100, // Limit each IP to 100 requests per window
  message: { error: 'Too many requests from this IP. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for registration & reset endpoints to prevent spamming
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5, // start blocking after 5 requests
  message: { error: 'Too many accounts created from this IP. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 3,
  message: { error: 'Too many password reset requests. Please try again in 15 minutes.' },
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

// Helper function to log audit events
async function logAuditEvent(userId, action, details, ipAddress) {
  try {
    await dbRun(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
      [userId, action, JSON.stringify(details || {}), ipAddress]
    );
  } catch (e) {
    console.error('Failed to write audit log:', e);
  }
}

module.exports = {
  apiLimiter,
  registerLimiter,
  passwordResetLimiter,
  sanitizeInput,
  xssSanitizer,
  logAuditEvent
};
