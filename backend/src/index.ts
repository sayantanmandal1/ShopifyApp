import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { config } from './config';
import { logger } from './utils/logger';
import authRoutes from './routes/auth.routes';
import tenantRoutes from './routes/tenant.routes';
import { authenticate } from './middleware/auth.middleware';

// Load environment variables
dotenv.config({ path: '../.env' });

const app: Application = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: config.frontendUrl, credentials: true }));
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

// Protected routes example
app.get('/api/protected', authenticate, (_req, res) => {
  res.json({ message: 'This is a protected route', user: _req.user });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${config.nodeEnv} mode`);
});

export default app;
