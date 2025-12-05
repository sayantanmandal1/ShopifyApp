import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { config } from './config';
import { logger } from './utils/logger';
import authRoutes from './routes/auth.routes';
import tenantRoutes from './routes/tenant.routes';
import ingestionRoutes from './routes/ingestion.routes';
import webhookRoutes from './routes/webhook.routes';
import analyticsRoutes from './routes/analytics.routes';
import { authenticate } from './middleware/auth.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

// Load environment variables
dotenv.config({ path: '../.env' });

const app: Application = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: config.frontendUrl, credentials: true }));

// Webhook routes need raw body for signature verification
// Must be registered before express.json() middleware
app.use(
  '/api/webhooks',
  express.raw({ type: 'application/json' }),
  (req, _res, next) => {
    // Store raw body and parse JSON manually
    if (req.body && Buffer.isBuffer(req.body)) {
      (req as any).rawBody = req.body.toString('utf8');
      try {
        req.body = JSON.parse((req as any).rawBody);
      } catch (error) {
        req.body = {};
      }
    }
    next();
  },
  webhookRoutes
);

// Standard JSON parsing for other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authentication routes (public)
app.use('/api/auth', authRoutes);

// Tenant routes
app.use('/api/tenants', tenantRoutes);

// Ingestion routes (protected)
app.use('/api/ingestion', ingestionRoutes);

// Analytics routes (protected)
app.use('/api/analytics', analyticsRoutes);

// Note: Webhook routes are registered above before JSON middleware

// Protected routes example
app.get('/api/protected', authenticate, (_req, res) => {
  res.json({ message: 'This is a protected route', user: _req.user });
});

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${config.nodeEnv} mode`);
});

export default app;
