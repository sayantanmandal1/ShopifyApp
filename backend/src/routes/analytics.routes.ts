import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { AnalyticsService } from '../services/analytics.service';
import { logger } from '../utils/logger';

const router = Router();
const analyticsService = new AnalyticsService();

// All analytics routes require authentication
router.use(authenticate);

/**
 * GET /api/analytics/metrics
 * Get aggregate metrics (total customers, orders, revenue)
 * Requirements: 7.1, 7.2, 7.3
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    const metrics = await analyticsService.getMetrics(tenantId);

    return res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error: any) {
    logger.error(`Get metrics error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to retrieve metrics',
      details: error.message,
    });
  }
});

/**
 * GET /api/analytics/orders-by-date
 * Get orders grouped by date with optional date range filtering
 * Query params: startDate (ISO string), endDate (ISO string)
 * Requirements: 8.1, 8.2
 */
router.get('/orders-by-date', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    // Parse optional date range parameters
    const { startDate, endDate } = req.query;
    
    let parsedStartDate: Date | undefined;
    let parsedEndDate: Date | undefined;

    if (startDate && typeof startDate === 'string') {
      parsedStartDate = new Date(startDate);
      if (isNaN(parsedStartDate.getTime())) {
        return res.status(400).json({
          error: 'Validation failed',
          details: ['Invalid startDate format. Use ISO 8601 format.'],
        });
      }
    }

    if (endDate && typeof endDate === 'string') {
      parsedEndDate = new Date(endDate);
      if (isNaN(parsedEndDate.getTime())) {
        return res.status(400).json({
          error: 'Validation failed',
          details: ['Invalid endDate format. Use ISO 8601 format.'],
        });
      }
    }

    const ordersByDate = await analyticsService.getOrdersByDate(
      tenantId,
      parsedStartDate,
      parsedEndDate
    );

    return res.status(200).json({
      success: true,
      data: ordersByDate,
    });
  } catch (error: any) {
    logger.error(`Get orders by date error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to retrieve orders by date',
      details: error.message,
    });
  }
});

/**
 * GET /api/analytics/top-customers
 * Get top 5 customers by total spend
 * Requirements: 9.1
 */
router.get('/top-customers', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    const topCustomers = await analyticsService.getTopCustomers(tenantId, 5);

    return res.status(200).json({
      success: true,
      data: topCustomers,
    });
  } catch (error: any) {
    logger.error(`Get top customers error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to retrieve top customers',
      details: error.message,
    });
  }
});

/**
 * GET /api/analytics/revenue-trend
 * Get revenue trend over time with optional date range filtering
 * Query params: startDate (ISO string), endDate (ISO string)
 * Requirements: 10.1
 */
router.get('/revenue-trend', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    // Parse optional date range parameters
    const { startDate, endDate } = req.query;
    
    let parsedStartDate: Date | undefined;
    let parsedEndDate: Date | undefined;

    if (startDate && typeof startDate === 'string') {
      parsedStartDate = new Date(startDate);
      if (isNaN(parsedStartDate.getTime())) {
        return res.status(400).json({
          error: 'Validation failed',
          details: ['Invalid startDate format. Use ISO 8601 format.'],
        });
      }
    }

    if (endDate && typeof endDate === 'string') {
      parsedEndDate = new Date(endDate);
      if (isNaN(parsedEndDate.getTime())) {
        return res.status(400).json({
          error: 'Validation failed',
          details: ['Invalid endDate format. Use ISO 8601 format.'],
        });
      }
    }

    const revenueTrend = await analyticsService.getRevenueTrend(
      tenantId,
      parsedStartDate,
      parsedEndDate
    );

    return res.status(200).json({
      success: true,
      data: revenueTrend,
    });
  } catch (error: any) {
    logger.error(`Get revenue trend error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to retrieve revenue trend',
      details: error.message,
    });
  }
});

/**
 * GET /api/analytics/customer-trend
 * Get customer acquisition trend over time with optional date range filtering
 * Query params: startDate (ISO string), endDate (ISO string)
 * Requirements: 10.1
 */
router.get('/customer-trend', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    // Parse optional date range parameters
    const { startDate, endDate } = req.query;
    
    let parsedStartDate: Date | undefined;
    let parsedEndDate: Date | undefined;

    if (startDate && typeof startDate === 'string') {
      parsedStartDate = new Date(startDate);
      if (isNaN(parsedStartDate.getTime())) {
        return res.status(400).json({
          error: 'Validation failed',
          details: ['Invalid startDate format. Use ISO 8601 format.'],
        });
      }
    }

    if (endDate && typeof endDate === 'string') {
      parsedEndDate = new Date(endDate);
      if (isNaN(parsedEndDate.getTime())) {
        return res.status(400).json({
          error: 'Validation failed',
          details: ['Invalid endDate format. Use ISO 8601 format.'],
        });
      }
    }

    const customerTrend = await analyticsService.getCustomerTrend(
      tenantId,
      parsedStartDate,
      parsedEndDate
    );

    return res.status(200).json({
      success: true,
      data: customerTrend,
    });
  } catch (error: any) {
    logger.error(`Get customer trend error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to retrieve customer trend',
      details: error.message,
    });
  }
});

export default router;
