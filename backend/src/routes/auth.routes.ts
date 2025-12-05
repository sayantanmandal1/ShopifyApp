import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, tenantId } = req.body;

    // Validate input
    if (!email || !password || !tenantId) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['email, password, and tenantId are required'],
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['Invalid email format'],
      });
    }

    // Validate password length
    if (password.length < 8) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['Password must be at least 8 characters long'],
      });
    }

    const result = await authService.register({ email, password, tenantId });

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Registration error:', error);
    const message = error instanceof Error ? error.message : 'Registration failed';
    
    if (message.includes('already exists')) {
      return res.status(400).json({ error: message });
    }
    
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/login
 * Login an existing user
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['email and password are required'],
      });
    }

    const result = await authService.login({ email, password });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Login error:', error);
    const message = error instanceof Error ? error.message : 'Login failed';
    
    if (message.includes('Invalid email or password')) {
      return res.status(401).json({ error: message });
    }
    
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/logout
 * Logout current user
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    // Extract user ID from request (set by auth middleware)
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    await authService.logout(userId);

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('Logout error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/me
 * Get current user information
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    // Extract user info from request (set by auth middleware)
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user.userId,
        email: user.email,
        tenantId: user.tenantId,
      },
    });
  } catch (error) {
    logger.error('Get user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
