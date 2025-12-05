import prisma from '../db/prisma';
import { logger } from '../utils/logger';
import { verifyWebhookSignature } from '../utils/webhook';
import { decrypt } from '../utils/encryption';

export interface WebhookVerificationResult {
  isValid: boolean;
  tenantId?: string;
  error?: string;
}

export interface CartAbandonedPayload {
  id?: number;
  token?: string;
  cart_token?: string;
  customer?: {
    id: number;
    email?: string;
    first_name?: string;
    last_name?: string;
  };
  line_items?: any[];
  abandoned_checkout_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CheckoutStartedPayload {
  id?: number;
  token?: string;
  customer?: {
    id: number;
    email?: string;
    first_name?: string;
    last_name?: string;
  };
  line_items?: any[];
  total_price?: string;
  created_at?: string;
  updated_at?: string;
}

export class WebhookService {
  /**
   * Verify webhook authenticity using HMAC signature
   * @param shopDomain - Shop domain from webhook header
   * @param payload - Raw webhook payload as string
   * @param signature - HMAC signature from header
   * @returns Verification result with tenant ID if valid
   */
  async verifyWebhook(
    shopDomain: string,
    payload: string,
    signature: string
  ): Promise<WebhookVerificationResult> {
    try {
      // Find tenant by shop domain
      const tenant = await prisma.tenant.findUnique({
        where: { shopDomain },
      });

      if (!tenant) {
        logger.warn(`Webhook received for unknown shop domain: ${shopDomain}`);
        return {
          isValid: false,
          error: 'Unknown shop domain',
        };
      }

      // Decrypt the API secret or access token to use for verification
      // Shopify uses the API secret for webhook verification
      const secret = tenant.apiSecretEncrypted
        ? decrypt(tenant.apiSecretEncrypted)
        : decrypt(tenant.accessTokenEncrypted);

      // Verify the HMAC signature
      const isValid = verifyWebhookSignature(payload, signature, secret);

      if (!isValid) {
        logger.error(`Invalid webhook signature for tenant ${tenant.id} (${shopDomain})`);
        return {
          isValid: false,
          error: 'Invalid signature',
        };
      }

      logger.info(`Webhook verified successfully for tenant ${tenant.id} (${shopDomain})`);
      return {
        isValid: true,
        tenantId: tenant.id,
      };
    } catch (error: any) {
      logger.error(`Error verifying webhook: ${error.message}`);
      return {
        isValid: false,
        error: 'Verification error',
      };
    }
  }

  /**
   * Handle cart abandoned webhook event
   * @param tenantId - Tenant identifier
   * @param payload - Cart abandoned event payload
   */
  async handleCartAbandoned(tenantId: string, payload: CartAbandonedPayload): Promise<void> {
    try {
      // Find or create customer if customer data is present
      let customerId: string | null = null;
      if (payload.customer?.id) {
        const customer = await prisma.customer.findUnique({
          where: {
            tenantId_shopifyCustomerId: {
              tenantId,
              shopifyCustomerId: BigInt(payload.customer.id),
            },
          },
        });
        customerId = customer?.id || null;
      }

      // Store the cart abandoned event
      await prisma.event.create({
        data: {
          tenantId,
          eventType: 'cart_abandoned',
          shopifyId: payload.id ? BigInt(payload.id) : null,
          customerId,
          payload: payload as any,
        },
      });

      logger.info(`Cart abandoned event stored for tenant ${tenantId}`);
    } catch (error: any) {
      logger.error(`Error handling cart abandoned event: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle checkout started webhook event
   * @param tenantId - Tenant identifier
   * @param payload - Checkout started event payload
   */
  async handleCheckoutStarted(tenantId: string, payload: CheckoutStartedPayload): Promise<void> {
    try {
      // Find or create customer if customer data is present
      let customerId: string | null = null;
      if (payload.customer?.id) {
        const customer = await prisma.customer.findUnique({
          where: {
            tenantId_shopifyCustomerId: {
              tenantId,
              shopifyCustomerId: BigInt(payload.customer.id),
            },
          },
        });
        customerId = customer?.id || null;
      }

      // Store the checkout started event
      await prisma.event.create({
        data: {
          tenantId,
          eventType: 'checkout_started',
          shopifyId: payload.id ? BigInt(payload.id) : null,
          customerId,
          payload: payload as any,
        },
      });

      logger.info(`Checkout started event stored for tenant ${tenantId}`);
    } catch (error: any) {
      logger.error(`Error handling checkout started event: ${error.message}`);
      throw error;
    }
  }
}

export const webhookService = new WebhookService();
