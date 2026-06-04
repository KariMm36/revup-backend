'use strict';

require('dotenv').config();

// ─── Sentry (must be initialized before everything else) ───────────────────────────
const Sentry = require('@sentry/node');
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0,
  });
}

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const requestLogger = require('./middlewares/requestLogger');

const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const companyRoutes = require('./routes/companyRoutes');
const jobRoutes = require('./routes/jobRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const skillRoutes = require('./routes/skillRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const courseRoutes = require('./routes/courseRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const seedRoutes = require('./routes/seedRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const scheduleRoutes  = require('./routes/scheduleRoutes');
const errorHandler = require('./middlewares/errorHandler');
const passport = require('./config/passport'); // registers OAuth strategies

const app = express();

// ─── Trust Proxy (required for deployments behind reverse proxies) ────────────
// Enables express-rate-limit to correctly read X-Forwarded-For header
// Set to 1 to trust the first proxy hop (Render, Railway, Heroku, etc.)
app.set('trust proxy', 1);

// ─── Security Middleware ─────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS — Allow frontend to send Authorization headers & Cookies ──
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// ─── Global Rate Limiting (dynamic via GLOBAL_RATE_LIMIT_MAX env var) ───────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.GLOBAL_RATE_LIMIT_MAX) || 100,
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes.' },
});
app.use('/api', globalLimiter);

// ─── Request Logger ──────────────────────────────────────────────────────────────
app.use(requestLogger);

app.use(passport.initialize()); // OAuth — no sessions needed (JWT-based)

// ─── Body Parsers & Cookie Parser ────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Static File Serving (Uploads) ──────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ─── Swagger Docs ────────────────────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customSiteTitle: 'RevUp API Docs',
}));

app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/schedule',  scheduleRoutes);
// Seed route disabled after initial DB population
// app.use('/api/seed', seedRoutes);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ success: true, message: 'RevUp API is live ', version: '4.0.0' });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ─── Sentry Error Handler (must come before custom error handler) ─────────────────
if (process.env.SENTRY_DSN) {
  app.use(Sentry.expressErrorHandler());
}

// ─── Global Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
