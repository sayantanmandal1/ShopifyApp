import { Router, Request, Response } from 'express';
import { tenantService } from '../services/tenant.service';
import { authenticate } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/tenants
 * Register a new tenant (onboard Shopify store)
 * Public endpoint - no authentication required for initial onboarding
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { shopDomain, accessToken, apiKey, apiSecret } = req.body;

    // Validate required fields
    if (!shopDomain || !accessToken) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['shopDomain and accessToken are required'],
      });
    }

    // Register tenant
    const tenant = await tenantService.registerTenant({
      shopDomain,
      accessToken,
      apiKey,
      apiSecret,
    });

    return res.status(201).json({
      success: true,
      data: tenant,
    });
  } catch (error: any) {
    logger.error(`Tenant registration error: ${error.message}`);

    // Handle specific error cases
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        error: 'Tenant already exists',
        details: [error.message],
      });
    }

    if (error.message.includes('credential validation failed') || 
        error.message.includes('Invalid Shopify credentials') ||
        error.message.includes('Invalid shop domain')) {
      return res.status(400).json({
        error: 'Invalid Shopify credentials',
        details: [error.message],
      });
    }

    return res.status(500).json({
      error: 'Failed to register tenant',
      details: [error.message],
    });
  }
});

/**
 * GET /api/tenants/me
 * Get current tenant information (requires authentication)
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    const tenant = await tenantService.getTenantById(tenantId);

    if (!tenant) {
      return res.status(404).json({
        error: 'Tenant not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: tenant,
    });
  } catch (error: any) {
    logger.error(`Get tenant error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to retrieve tenant information',
    });
  }
});

/**
 * GET /api/tenants/:id
 * Get tenant by ID (requires authentication)
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const requestingTenantId = req.user?.tenantId;

    // Ensure users can only access their own tenant information
    if (id !== requestingTenantId) {
      return res.status(403).json({
        error: 'Access denied',
      });
    }

    const tenant = await tenantService.getTenantById(id);

    if (!tenant) {
      return res.status(404).json({
        error: 'Tenant not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: tenant,
    });
  } catch (error: any) {
    logger.error(`Get tenant by ID error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to retrieve tenant information',
    });
  }
});

export default router;
