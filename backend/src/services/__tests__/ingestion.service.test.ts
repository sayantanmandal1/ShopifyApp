import { IngestionService } from '../ingestion.service';
import prisma from '../../db/prisma';
import { ShopifyClient } from '../../clients/shopify.client';
import { encrypt } from '../../utils/encryption';

// Mock dependencies
jest.mock('../../db/prisma', () => ({
  __esModule: true,
  default: {
    tenant: {
      findUnique: jest.fn(),
    },
    customer: {
      upsert: jest.fn(),
    },
  },
}));

jest.mock('../../clients/shopify.client');

describe('IngestionService', () => {
  let ingestionService: IngestionService;
  const mockTenantId = 'test-tenant-id';
  const mockShopDomain = 'test-shop.myshopify.com';
  const mockAccessToken = 'test-access-token';

  beforeEach(() => {
    ingestionService = new IngestionService();
    jest.clearAllMocks();
  });

  describe('ingestCustomers', () => {
    it('should successfully ingest customers from Shopify', async () => {
      // Mock tenant lookup
      const mockTenant = {
        id: mockTenantId,
        shopDomain: mockShopDomain,
        accessTokenEncrypted: encrypt(mockAccessToken),
      };

      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);

      // Mock Shopify customers
      const mockCustomers = [
        {
          id: 123,
          email: 'customer1@example.com',
          first_name: 'John',
          last_name: 'Doe',
          total_spent: '100.50',
          orders_count: 5,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
        {
          id: 456,
          email: 'customer2@example.com',
          first_name: 'Jane',
          last_name: 'Smith',
          total_spent: '250.75',
          orders_count: 10,
          created_at: '2024-01-03T00:00:00Z',
          updated_at: '2024-01-04T00:00:00Z',
        },
      ];

      // Mock ShopifyClient
      const mockGetCustomers = jest.fn().mockResolvedValue(mockCustomers);
      (ShopifyClient as jest.MockedClass<typeof ShopifyClient>).mockImplementation(() => ({
        getCustomers: mockGetCustomers,
      } as any));

      // Mock customer upsert
      (prisma.customer.upsert as jest.Mock).mockResolvedValue({});

      // Execute ingestion
      const result = await ingestionService.ingestCustomers(mockTenantId);

      // Verify results
      expect(result.count).toBe(2);
      expect(result.errors).toHaveLength(0);

      // Verify tenant lookup
      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: mockTenantId },
      });

      // Verify Shopify client was called
      expect(mockGetCustomers).toHaveBeenCalledWith({ limit: 250 });

      // Verify customer upserts
      expect(prisma.customer.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.customer.upsert).toHaveBeenCalledWith({
        where: {
          tenantId_shopifyCustomerId: {
            tenantId: mockTenantId,
            shopifyCustomerId: BigInt(123),
          },
        },
        update: expect.objectContaining({
          email: 'customer1@example.com',
          firstName: 'John',
          lastName: 'Doe',
          totalSpent: 100.5,
          ordersCount: 5,
        }),
        create: expect.objectContaining({
          tenantId: mockTenantId,
          shopifyCustomerId: BigInt(123),
          email: 'customer1@example.com',
          firstName: 'John',
          lastName: 'Doe',
          totalSpent: 100.5,
          ordersCount: 5,
        }),
      });
    });

    it('should handle errors gracefully and continue processing', async () => {
      // Mock tenant lookup
      const mockTenant = {
        id: mockTenantId,
        shopDomain: mockShopDomain,
        accessTokenEncrypted: encrypt(mockAccessToken),
      };

      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);

      // Mock Shopify customers
      const mockCustomers = [
        {
          id: 123,
          email: 'customer1@example.com',
          first_name: 'John',
          last_name: 'Doe',
          total_spent: '100.50',
          orders_count: 5,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ];

      // Mock ShopifyClient
      const mockGetCustomers = jest.fn().mockResolvedValue(mockCustomers);
      (ShopifyClient as jest.MockedClass<typeof ShopifyClient>).mockImplementation(() => ({
        getCustomers: mockGetCustomers,
      } as any));

      // Mock customer upsert to fail
      (prisma.customer.upsert as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Execute ingestion
      const result = await ingestionService.ingestCustomers(mockTenantId);

      // Verify results - count should be 0 because upsert failed
      expect(result.count).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to upsert customer 123');
    });

    it('should handle tenant not found error', async () => {
      // Mock tenant lookup to return null
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      // Execute ingestion
      const result = await ingestionService.ingestCustomers(mockTenantId);

      // Verify results
      expect(result.count).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Tenant not found');
    });
  });
});
