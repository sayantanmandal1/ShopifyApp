import { Router, Request, Response } from 'express';
import { webhookService } from '../services/webhook.service';
import { extractShopDomain } from '../utils/webhook';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Note: Raw body handling is done in index.ts before this router is mounted
 * This ensures webhook signature verification works correctly
 */

/**
 * POST /api/webhooks/cart-abandoned
 * Handle cart abandoned webhook from Shopify
 */
router.post('/cart-abandoned', async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();

  try {
    // Extract required headers
    const signature = req.get('X-Shopify-Hmac-Sha256');
    const shopDomainHeader = req.get('X-Shopify-Shop-Domain');
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    if (!signature) {
      logger.warn('Cart abandoned webhook received without signature');
      return res.status(401).json({ error: 'Missing signature' });
    }

    if (!shopDomainHeader) {
      logger.warn('Cart abandoned webhook received without shop domain');
      return res.status(400).json({ error: 'Missing shop domain' });
    }

    const shopDomain = extractShopDomain(shopDomainHeader);
    if (!shopDomain) {
      logger.warn('Cart abandoned webhook received with invalid shop domain');
      return res.status(400).json({ error: 'Invalid shop domain' });
    }

    // Verify webhook authenticity
    const verification = await webhookService.verifyWebhook(
      shopDomain,
      rawBody,
      signature
    );

    if (!verification.isValid) {
      logger.error(`Cart abandoned webhook verification failed: ${verification.error}`);
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    // Handle the cart abandoned event
    await webhookService.handleCartAbandoned(verification.tenantId!, req.body);

    const duration = Date.now() - startTime;
    logger.info(`Cart abandoned webhook processed in ${duration}ms`);

    // Respond with success within 3 seconds
    res.status(200).json({ success: true });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error(`Error processing cart abandoned webhook (${duration}ms): ${error.message}`);
    
    // Still respond with 200 to prevent Shopify from retrying
    // Log the error for investigation
    res.status(200).json({ success: false, error: 'Internal error' });
  }
});

/**
 * POST /api/webhooks/checkout-started
 * Handle checkout started webhook from Shopify
 */
router.post('/checkout-started', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Extract required headers
    const signature = req.get('X-Shopify-Hmac-Sha256');
    const shopDomainHeader = req.get('X-Shopify-Shop-Domain');
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    if (!signature) {
      logger.warn('Checkout started webhook received without signature');
      return res.status(401).json({ error: 'Missing signature' });
    }

    if (!shopDomainHeader) {
      logger.warn('Checkout started webhook received without shop domain');
      return res.status(400).json({ error: 'Missing shop domain' });
    }

    const shopDomain = extractShopDomain(shopDomainHeader);
    if (!shopDomain) {
      logger.warn('Checkout started webhook received with invalid shop domain');
      return res.status(400).json({ error: 'Invalid shop domain' });
    }

    // Verify webhook authenticity
    const verification = await webhookService.verifyWebhook(
      shopDomain,
      rawBody,
      signature
    );

    if (!verification.isValid) {
      logger.error(`Checkout started webhook verification failed: ${verification.error}`);
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    // Handle the checkout started event
    await webhookService.handleCheckoutStarted(verification.tenantId!, req.body);

    const duration = Date.now() - startTime;
    logger.info(`Checkout started webhook processed in ${duration}ms`);

    // Respond with success within 3 seconds
    res.status(200).json({ success: true });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error(`Error processing checkout started webhook (${duration}ms): ${error.message}`);
    
    // Still respond with 200 to prevent Shopify from retrying
    // Log the error for investigation
    res.status(200).json({ success: false, error: 'Internal error' });
  }
});

export default router;
