import crypto from 'crypto';
import { verifyWebhookSignature, extractShopDomain } from '../webhook';

describe('Webhook Utilities', () => {
  describe('verifyWebhookSignature', () => {
    it('should verify valid webhook signature', () => {
      const secret = 'test-secret-key';
      const payload = JSON.stringify({ id: 123, test: 'data' });
      
      // Generate valid signature
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(payload, 'utf8');
      const signature = hmac.digest('base64');

      const result = verifyWebhookSignature(payload, signature, secret);
      expect(result).toBe(true);
    });

    it('should reject invalid webhook signature', () => {
      const secret = 'test-secret-key';
      const payload = JSON.stringify({ id: 123, test: 'data' });
      const invalidSignature = 'invalid-signature';

      const result = verifyWebhookSignature(payload, invalidSignature, secret);
      expect(result).toBe(false);
    });

    it('should reject signature with wrong secret', () => {
      const secret = 'test-secret-key';
      const wrongSecret = 'wrong-secret-key';
      const payload = JSON.stringify({ id: 123, test: 'data' });
      
      // Generate signature with wrong secret
      const hmac = crypto.createHmac('sha256', wrongSecret);
      hmac.update(payload, 'utf8');
      const signature = hmac.digest('base64');

      const result = verifyWebhookSignature(payload, signature, secret);
      expect(result).toBe(false);
    });

    it('should reject signature with modified payload', () => {
      const secret = 'test-secret-key';
      const originalPayload = JSON.stringify({ id: 123, test: 'data' });
      const modifiedPayload = JSON.stringify({ id: 456, test: 'modified' });
      
      // Generate signature with original payload
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(originalPayload, 'utf8');
      const signature = hmac.digest('base64');

      // Verify with modified payload
      const result = verifyWebhookSignature(modifiedPayload, signature, secret);
      expect(result).toBe(false);
    });
  });

  describe('extractShopDomain', () => {
    it('should extract and normalize shop domain', () => {
      const result = extractShopDomain('test-shop.myshopify.com');
      expect(result).toBe('test-shop.myshopify.com');
    });

    it('should remove protocol from domain', () => {
      const result = extractShopDomain('https://test-shop.myshopify.com');
      expect(result).toBe('test-shop.myshopify.com');
    });

    it('should remove www from domain', () => {
      const result = extractShopDomain('www.test-shop.myshopify.com');
      expect(result).toBe('test-shop.myshopify.com');
    });

    it('should remove trailing slash from domain', () => {
      const result = extractShopDomain('test-shop.myshopify.com/');
      expect(result).toBe('test-shop.myshopify.com');
    });

    it('should convert domain to lowercase', () => {
      const result = extractShopDomain('TEST-SHOP.MYSHOPIFY.COM');
      expect(result).toBe('test-shop.myshopify.com');
    });

    it('should handle complex domain normalization', () => {
      const result = extractShopDomain('HTTPS://WWW.TEST-SHOP.MYSHOPIFY.COM/');
      expect(result).toBe('test-shop.myshopify.com');
    });

    it('should return null for undefined input', () => {
      const result = extractShopDomain(undefined);
      expect(result).toBe(null);
    });
  });
});
