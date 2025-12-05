import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { logger } from '../utils/logger';

/**
 * Extend Express Request type to include user information
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        tenantId: string;
      };
    }
  }
}

/**
 * Authentication middleware
 * Validates JWT token and extracts user information
 * Rejects unauthenticated requests to protected routes
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Check if header follows "Bearer <token>" format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({ error: 'Invalid authorization header format' });
      return;
    }

    const token = parts[1];

    // Validate JWT token
    let payload;
    try {
      payload = authService.validateToken(token);
    } catch (error) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Validate session exists in Redis
    const isSessionValid = await authService.validateSession(payload.userId, token);
    if (!isSessionValid) {
      res.status(401).json({ error: 'Session expired or invalid' });
      return;
    }

    // Attach user information to request object
    req.user = {
      userId: payload.userId,
      email: payload.email,
      tenantId: payload.tenantId,
    };

    // Continue to next middleware/route handler
    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Optional authentication middleware
 * Attempts to authenticate but doesn't reject if authentication fails
 * Useful for routes that have different behavior for authenticated vs unauthenticated users
 */
export const optionalAuthenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      next();
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      next();
      return;
    }

    const token = parts[1];

    try {
      const payload = authService.validateToken(token);
      const isSessionValid = await authService.validateSession(payload.userId, token);

      if (isSessionValid) {
        req.user = {
          userId: payload.userId,
          email: payload.email,
          tenantId: payload.tenantId,
        };
      }
    } catch (error) {
      // Silently fail for optional authentication
      logger.debug('Optional authentication failed:', error);
    }

    next();
  } catch (error) {
    logger.error('Optional authentication middleware error:', error);
    next();
  }
};
