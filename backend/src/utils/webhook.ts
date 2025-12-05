import crypto from 'crypto';
import { logger } from './logger';

/**
 * Verify Shopify webhook signature using HMAC-SHA256
 * @param payload - Raw webhook payload as string
 * @param signature - HMAC signature from X-Shopify-Hmac-Sha256 header
 * @param secret - Shopify API secret or access token
 * @returns true if signature is valid, false otherwise
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    // Generate HMAC hash using SHA256
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload, 'utf8');
    const digest = hmac.digest('base64');

    // Compare the generated hash with the provided signature
    // Use timingSafeEqual to prevent timing attacks
    const signatureBuffer = Buffer.from(signature, 'base64');
    const digestBuffer = Buffer.from(digest, 'base64');

    if (signatureBuffer.length !== digestBuffer.length) {
      logger.warn('Webhook signature verification failed: length mismatch');
      return false;
    }

    const isValid = crypto.timingSafeEqual(signatureBuffer, digestBuffer);

    if (!isValid) {
      logger.warn('Webhook signature verification failed: signature mismatch');
    }

    return isValid;
  } catch (error: any) {
    logger.error(`Error verifying webhook signature: ${error.message}`);
    return false;
  }
}

/**
 * Extract shop domain from webhook headers
 * @param shopDomainHeader - Value from X-Shopify-Shop-Domain header
 * @returns normalized shop domain
 */
export function extractShopDomain(shopDomainHeader: string | undefined): string | null {
  if (!shopDomainHeader) {
    return null;
  }

  // Normalize the domain (remove protocol, www, trailing slashes)
  return shopDomainHeader
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
    .trim();
}
