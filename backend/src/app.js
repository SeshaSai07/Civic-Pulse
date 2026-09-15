const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');
const logger = require('./config/logger');
const env = require('./config/env');
const apiRoutes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();

// Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL || '*',
    credentials: true,
  })
);

// Body Parsers & Logging
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(pinoHttp({ logger }));

// Rate Limiting
app.use('/api', apiLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'CivicPulse API Server', timestamp: new Date() });
});

// API Routes
app.use('/api', apiRoutes);

// Catch-all 404 Route
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

module.exports = app;
