import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { queueService } from '../services/queue.service';
import { logger } from '../utils/logger';

const router = Router();

// All ingestion routes require authentication
router.use(authenticate);

/**
 * POST /api/ingestion/sync
 * Trigger a full data sync (customers, orders, and products)
 */
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        error: 'Tenant ID not found in authentication context',
      });
    }

    logger.info(`Full sync requested for tenant ${tenantId}`);

    const jobIds = await queueService.scheduleFullSync(tenantId);

    return res.status(202).json({
      message: 'Full data sync scheduled',
      jobIds,
      tenantId,
    });
  } catch (error: any) {
    logger.error('Failed to schedule full sync', { error: error.message });
    return res.status(500).json({
      error: 'Failed to schedule full sync',
      details: error.message,
    });
  }
});

/**
 * POST /api/ingestion/customers
 * Trigger customer data ingestion only
 */
router.post('/customers', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        error: 'Tenant ID not found in authentication context',
      });
    }

    logger.info(`Customer ingestion requested for tenant ${tenantId}`);

    const jobId = await queueService.scheduleCustomerIngestion(tenantId);

    return res.status(202).json({
      message: 'Customer ingestion scheduled',
      jobId,
      tenantId,
    });
  } catch (error: any) {
    logger.error('Failed to schedule customer ingestion', {
      error: error.message,
    });
    return res.status(500).json({
      error: 'Failed to schedule customer ingestion',
      details: error.message,
    });
  }
});

/**
 * POST /api/ingestion/orders
 * Trigger order data ingestion only
 */
router.post('/orders', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        error: 'Tenant ID not found in authentication context',
      });
    }

    logger.info(`Order ingestion requested for tenant ${tenantId}`);

    const jobId = await queueService.scheduleOrderIngestion(tenantId);

    return res.status(202).json({
      message: 'Order ingestion scheduled',
      jobId,
      tenantId,
    });
  } catch (error: any) {
    logger.error('Failed to schedule order ingestion', {
      error: error.message,
    });
    return res.status(500).json({
      error: 'Failed to schedule order ingestion',
      details: error.message,
    });
  }
});

/**
 * POST /api/ingestion/products
 * Trigger product data ingestion only
 */
router.post('/products', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        error: 'Tenant ID not found in authentication context',
      });
    }

    logger.info(`Product ingestion requested for tenant ${tenantId}`);

    const jobId = await queueService.scheduleProductIngestion(tenantId);

    return res.status(202).json({
      message: 'Product ingestion scheduled',
      jobId,
      tenantId,
    });
  } catch (error: any) {
    logger.error('Failed to schedule product ingestion', {
      error: error.message,
    });
    return res.status(500).json({
      error: 'Failed to schedule product ingestion',
      details: error.message,
    });
  }
});

/**
 * GET /api/ingestion/status/:jobId
 * Get the status of a specific ingestion job
 */
router.get('/status/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        error: 'Tenant ID not found in authentication context',
      });
    }

    const jobStatus = await queueService.getJobStatus(jobId);

    if (!jobStatus) {
      return res.status(404).json({
        error: 'Job not found',
        jobId,
      });
    }

    // Verify the job belongs to the requesting tenant
    if (jobStatus.data.tenantId !== tenantId) {
      return res.status(403).json({
        error: 'Access denied to this job',
      });
    }

    return res.status(200).json({
      jobId: jobStatus.id,
      state: jobStatus.state,
      progress: jobStatus.progress,
      type: jobStatus.data.type,
      result: jobStatus.result,
      failedReason: jobStatus.failedReason,
      attemptsMade: jobStatus.attemptsMade,
      processedOn: jobStatus.processedOn,
      finishedOn: jobStatus.finishedOn,
    });
  } catch (error: any) {
    logger.error('Failed to get job status', { error: error.message });
    return res.status(500).json({
      error: 'Failed to get job status',
      details: error.message,
    });
  }
});

/**
 * GET /api/ingestion/queue/stats
 * Get queue statistics
 */
router.get('/queue/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        error: 'Tenant ID not found in authentication context',
      });
    }

    const stats = await queueService.getQueueStats();

    return res.status(200).json({
      stats,
    });
  } catch (error: any) {
    logger.error('Failed to get queue stats', { error: error.message });
    return res.status(500).json({
      error: 'Failed to get queue stats',
      details: error.message,
    });
  }
});

export default router;

