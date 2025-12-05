import { tenantService } from '../tenant.service';
import prisma from '../../db/prisma';
import { ShopifyClient } from '../../clients/shopify.client';
import * as encryption from '../../utils/encryption';

// Mock dependencies
jest.mock('../../db/prisma', () => ({
  __esModule: true,
  default: {
    tenant: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('../../clients/shopify.client');
jest.mock('../../utils/encryption');

describe('TenantService', () => {
  const mockShopDomain = 'test-shop.myshopify.com';
  const mockAccessToken = 'shpat_test123456789';
  const mockTenantId = 'tenant-123';
  const mockEncryptedToken = 'encrypted:token:data';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerTenant', () => {
    it('should register a new tenant with valid credentials', async () => {
      // Mock no existing tenant
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      // Mock successful Shopify validation
      const mockValidateCredentials = jest.fn().mockResolvedValue({
        id: 12345,
        name: 'Test Shop',
        domain: mockShopDomain,
      });
      (ShopifyClient as jest.Mock).mockImplementation(() => ({
        validateCredentials: mockValidateCredentials,
      }));

      // Mock encryption
      (encryption.encrypt as jest.Mock).mockReturnValue(mockEncryptedToken);

      // Mock tenant creation
      const mockTenant = {
        id: mockTenantId,
        shopDomain: mockShopDomain,
        accessTokenEncrypted: mockEncryptedToken,
        apiKey: null,
        apiSecretEncrypted: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.tenant.create as jest.Mock).mockResolvedValue(mockTenant);

      const result = await tenantService.registerTenant({
        shopDomain: mockShopDomain,
        accessToken: mockAccessToken,
      });

      expect(result.id).toBe(mockTenantId);
      expect(result.shopDomain).toBe(mockShopDomain);
      expect(mockValidateCredentials).toHaveBeenCalled();
      expect(encryption.encrypt).toHaveBeenCalledWith(mockAccessToken);
      expect(prisma.tenant.create).toHaveBeenCalledWith({
        data: {
          shopDomain: mockShopDomain,
          accessTokenEncrypted: mockEncryptedToken,
          apiKey: null,
          apiSecretEncrypted: null,
        },
      });
    });

    it('should prevent duplicate tenant creation for same shop domain', async () => {
      // Mock existing tenant
      const existingTenant = {
        id: mockTenantId,
        shopDomain: mockShopDomain,
        accessTokenEncrypted: mockEncryptedToken,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(existingTenant);

      await expect(
        tenantService.registerTenant({
          shopDomain: mockShopDomain,
          accessToken: mockAccessToken,
        })
      ).rejects.toThrow('A tenant with this shop domain already exists');

      // Should not attempt to validate or create
      expect(ShopifyClient).not.toHaveBeenCalled();
      expect(prisma.tenant.create).not.toHaveBeenCalled();
    });

    it('should reject invalid Shopify credentials', async () => {
      // Mock no existing tenant
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      // Mock failed Shopify validation
      const mockValidateCredentials = jest.fn().mockRejectedValue(
        new Error('Invalid Shopify credentials')
      );
      (ShopifyClient as jest.Mock).mockImplementation(() => ({
        validateCredentials: mockValidateCredentials,
      }));

      await expect(
        tenantService.registerTenant({
          shopDomain: mockShopDomain,
          accessToken: 'invalid-token',
        })
      ).rejects.toThrow('Shopify credential validation failed');

      // Should not create tenant
      expect(prisma.tenant.create).not.toHaveBeenCalled();
    });

    it('should normalize shop domain before storing', async () => {
      const unnormalizedDomain = 'HTTPS://WWW.Test-Shop.MyShopify.com/';
      const normalizedDomain = 'test-shop.myshopify.com';

      // Mock no existing tenant
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      // Mock successful Shopify validation
      const mockValidateCredentials = jest.fn().mockResolvedValue({
        id: 12345,
        name: 'Test Shop',
        domain: normalizedDomain,
      });
      (ShopifyClient as jest.Mock).mockImplementation(() => ({
        validateCredentials: mockValidateCredentials,
      }));

      // Mock encryption
      (encryption.encrypt as jest.Mock).mockReturnValue(mockEncryptedToken);

      // Mock tenant creation
      const mockTenant = {
        id: mockTenantId,
        shopDomain: normalizedDomain,
        accessTokenEncrypted: mockEncryptedToken,
        apiKey: null,
        apiSecretEncrypted: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.tenant.create as jest.Mock).mockResolvedValue(mockTenant);

      const result = await tenantService.registerTenant({
        shopDomain: unnormalizedDomain,
        accessToken: mockAccessToken,
      });

      expect(result.shopDomain).toBe(normalizedDomain);
      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { shopDomain: normalizedDomain },
      });
      expect(prisma.tenant.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          shopDomain: normalizedDomain,
        }),
      });
    });

    it('should encrypt API secret if provided', async () => {
      const mockApiSecret = 'secret123';
      const mockEncryptedSecret = 'encrypted:secret:data';

      // Mock no existing tenant
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      // Mock successful Shopify validation
      const mockValidateCredentials = jest.fn().mockResolvedValue({
        id: 12345,
        name: 'Test Shop',
        domain: mockShopDomain,
      });
      (ShopifyClient as jest.Mock).mockImplementation(() => ({
        validateCredentials: mockValidateCredentials,
      }));

      // Mock encryption - return different values for different inputs
      (encryption.encrypt as jest.Mock)
        .mockReturnValueOnce(mockEncryptedToken)
        .mockReturnValueOnce(mockEncryptedSecret);

      // Mock tenant creation
      const mockTenant = {
        id: mockTenantId,
        shopDomain: mockShopDomain,
        accessTokenEncrypted: mockEncryptedToken,
        apiKey: 'api-key-123',
        apiSecretEncrypted: mockEncryptedSecret,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.tenant.create as jest.Mock).mockResolvedValue(mockTenant);

      await tenantService.registerTenant({
        shopDomain: mockShopDomain,
        accessToken: mockAccessToken,
        apiKey: 'api-key-123',
        apiSecret: mockApiSecret,
      });

      expect(encryption.encrypt).toHaveBeenCalledWith(mockAccessToken);
      expect(encryption.encrypt).toHaveBeenCalledWith(mockApiSecret);
      expect(prisma.tenant.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          apiSecretEncrypted: mockEncryptedSecret,
        }),
      });
    });
  });

  describe('getTenantById', () => {
    it('should return tenant by ID', async () => {
      const mockTenant = {
        id: mockTenantId,
        shopDomain: mockShopDomain,
        accessTokenEncrypted: mockEncryptedToken,
        apiKey: null,
        apiSecretEncrypted: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);

      const result = await tenantService.getTenantById(mockTenantId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(mockTenantId);
      expect(result?.shopDomain).toBe(mockShopDomain);
    });

    it('should return null if tenant not found', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await tenantService.getTenantById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('getTenantByDomain', () => {
    it('should return tenant by shop domain', async () => {
      const mockTenant = {
        id: mockTenantId,
        shopDomain: mockShopDomain,
        accessTokenEncrypted: mockEncryptedToken,
        apiKey: null,
        apiSecretEncrypted: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);

      const result = await tenantService.getTenantByDomain(mockShopDomain);

      expect(result).toBeDefined();
      expect(result?.shopDomain).toBe(mockShopDomain);
    });

    it('should normalize domain before lookup', async () => {
      const unnormalizedDomain = 'HTTPS://Test-Shop.MyShopify.com/';
      const normalizedDomain = 'test-shop.myshopify.com';

      const mockTenant = {
        id: mockTenantId,
        shopDomain: normalizedDomain,
        accessTokenEncrypted: mockEncryptedToken,
        apiKey: null,
        apiSecretEncrypted: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);

      await tenantService.getTenantByDomain(unnormalizedDomain);

      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { shopDomain: normalizedDomain },
      });
    });
  });
});
