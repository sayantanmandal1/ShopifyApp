import { webhookService, CartAbandonedPayload, CheckoutStartedPayload } from '../webhook.service';
import prisma from '../../db/prisma';
import { encrypt } from '../../utils/encryption';
import crypto from 'crypto';

// Mock Prisma
jest.mock('../../db/prisma', () => ({
  __esModule: true,
  default: {
    tenant: {
      findUnique: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
    },
    event: {
      create: jest.fn(),
    },
  },
}));

describe('WebhookService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyWebhook', () => {
    it('should verify valid webhook and return tenant ID', async () => {
      const shopDomain = 'test-shop.myshopify.com';
      const secret = 'test-secret';
      const payload = JSON.stringify({ id: 123, test: 'data' });
      
      // Generate valid signature
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(payload, 'utf8');
      const signature = hmac.digest('base64');

      // Mock tenant lookup
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
        id: 'tenant-123',
        shopDomain,
        apiSecretEncrypted: encrypt(secret),
      });

      const result = await webhookService.verifyWebhook(shopDomain, payload, signature);

      expect(result.isValid).toBe(true);
      expect(result.tenantId).toBe('tenant-123');
      expect(result.error).toBeUndefined();
    });

    it('should reject webhook for unknown shop domain', async () => {
      const shopDomain = 'unknown-shop.myshopify.com';
      const payload = JSON.stringify({ id: 123 });
      const signature = 'some-signature';

      // Mock tenant not found
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await webhookService.verifyWebhook(shopDomain, payload, signature);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Unknown shop domain');
      expect(result.tenantId).toBeUndefined();
    });

    it('should reject webhook with invalid signature', async () => {
      const shopDomain = 'test-shop.myshopify.com';
      const secret = 'test-secret';
      const payload = JSON.stringify({ id: 123 });
      const invalidSignature = 'invalid-signature';

      // Mock tenant lookup
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
        id: 'tenant-123',
        shopDomain,
        apiSecretEncrypted: encrypt(secret),
      });

      const result = await webhookService.verifyWebhook(shopDomain, payload, invalidSignature);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid signature');
      expect(result.tenantId).toBeUndefined();
    });

    it('should use access token if API secret is not available', async () => {
      const shopDomain = 'test-shop.myshopify.com';
      const accessToken = 'test-access-token';
      const payload = JSON.stringify({ id: 123 });
      
      // Generate valid signature with access token
      const hmac = crypto.createHmac('sha256', accessToken);
      hmac.update(payload, 'utf8');
      const signature = hmac.digest('base64');

      // Mock tenant lookup without API secret
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
        id: 'tenant-123',
        shopDomain,
        accessTokenEncrypted: encrypt(accessToken),
        apiSecretEncrypted: null,
      });

      const result = await webhookService.verifyWebhook(shopDomain, payload, signature);

      expect(result.isValid).toBe(true);
      expect(result.tenantId).toBe('tenant-123');
    });
  });

  describe('handleCartAbandoned', () => {
    it('should store cart abandoned event with customer ID', async () => {
      const tenantId = 'tenant-123';
      const payload: CartAbandonedPayload = {
        id: 456,
        token: 'cart-token',
        customer: {
          id: 789,
          email: 'customer@example.com',
          first_name: 'John',
          last_name: 'Doe',
        },
        line_items: [],
      };

      // Mock customer lookup
      (prisma.customer.findUnique as jest.Mock).mockResolvedValue({
        id: 'customer-uuid',
        shopifyCustomerId: BigInt(789),
      });

      // Mock event creation
      (prisma.event.create as jest.Mock).mockResolvedValue({
        id: 'event-uuid',
        tenantId,
        eventType: 'cart_abandoned',
      });

      await webhookService.handleCartAbandoned(tenantId, payload);

      expect(prisma.event.create).toHaveBeenCalledWith({
        data: {
          tenantId,
          eventType: 'cart_abandoned',
          shopifyId: BigInt(456),
          customerId: 'customer-uuid',
          payload,
        },
      });
    });

    it('should store cart abandoned event without customer ID if customer not found', async () => {
      const tenantId = 'tenant-123';
      const payload: CartAbandonedPayload = {
        id: 456,
        token: 'cart-token',
        customer: {
          id: 789,
          email: 'customer@example.com',
        },
      };

      // Mock customer not found
      (prisma.customer.findUnique as jest.Mock).mockResolvedValue(null);

      // Mock event creation
      (prisma.event.create as jest.Mock).mockResolvedValue({
        id: 'event-uuid',
      });

      await webhookService.handleCartAbandoned(tenantId, payload);

      expect(prisma.event.create).toHaveBeenCalledWith({
        data: {
          tenantId,
          eventType: 'cart_abandoned',
          shopifyId: BigInt(456),
          customerId: null,
          payload,
        },
      });
    });

    it('should store cart abandoned event without customer data', async () => {
      const tenantId = 'tenant-123';
      const payload: CartAbandonedPayload = {
        id: 456,
        token: 'cart-token',
      };

      // Mock event creation
      (prisma.event.create as jest.Mock).mockResolvedValue({
        id: 'event-uuid',
      });

      await webhookService.handleCartAbandoned(tenantId, payload);

      expect(prisma.event.create).toHaveBeenCalledWith({
        data: {
          tenantId,
          eventType: 'cart_abandoned',
          shopifyId: BigInt(456),
          customerId: null,
          payload,
        },
      });
    });
  });

  describe('handleCheckoutStarted', () => {
    it('should store checkout started event with customer ID', async () => {
      const tenantId = 'tenant-123';
      const payload: CheckoutStartedPayload = {
        id: 789,
        token: 'checkout-token',
        customer: {
          id: 456,
          email: 'customer@example.com',
        },
        total_price: '99.99',
      };

      // Mock customer lookup
      (prisma.customer.findUnique as jest.Mock).mockResolvedValue({
        id: 'customer-uuid',
        shopifyCustomerId: BigInt(456),
      });

      // Mock event creation
      (prisma.event.create as jest.Mock).mockResolvedValue({
        id: 'event-uuid',
      });

      await webhookService.handleCheckoutStarted(tenantId, payload);

      expect(prisma.event.create).toHaveBeenCalledWith({
        data: {
          tenantId,
          eventType: 'checkout_started',
          shopifyId: BigInt(789),
          customerId: 'customer-uuid',
          payload,
        },
      });
    });

    it('should store checkout started event without customer ID if customer not found', async () => {
      const tenantId = 'tenant-123';
      const payload: CheckoutStartedPayload = {
        id: 789,
        token: 'checkout-token',
        customer: {
          id: 456,
          email: 'customer@example.com',
        },
      };

      // Mock customer not found
      (prisma.customer.findUnique as jest.Mock).mockResolvedValue(null);

      // Mock event creation
      (prisma.event.create as jest.Mock).mockResolvedValue({
        id: 'event-uuid',
      });

      await webhookService.handleCheckoutStarted(tenantId, payload);

      expect(prisma.event.create).toHaveBeenCalledWith({
        data: {
          tenantId,
          eventType: 'checkout_started',
          shopifyId: BigInt(789),
          customerId: null,
          payload,
        },
      });
    });
  });
});
