import { AnalyticsService } from '../analytics.service';
import prisma from '../../db/prisma';
import { CacheService } from '../cache.service';

// Mock dependencies
jest.mock('../../db/prisma', () => ({
  __esModule: true,
  default: {
    customer: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    order: {
      count: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
  },
}));

jest.mock('../cache.service');

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let mockCacheService: jest.Mocked<CacheService>;
  const mockTenantId = 'tenant-123';

  beforeEach(() => {
    jest.clearAllMocks();
    analyticsService = new AnalyticsService();
    mockCacheService = new CacheService() as jest.Mocked<CacheService>;
  });

  describe('getMetrics', () => {
    it('should return aggregate metrics for a tenant', async () => {
      // Mock cache miss
      mockCacheService.get = jest.fn().mockResolvedValue(null);
      mockCacheService.set = jest.fn().mockResolvedValue(true);

      // Mock database queries
      (prisma.customer.count as jest.Mock).mockResolvedValue(100);
      (prisma.order.count as jest.Mock).mockResolvedValue(250);
      (prisma.order.aggregate as jest.Mock).mockResolvedValue({
        _sum: { totalPrice: 15000.50 },
      });

      const result = await analyticsService.getMetrics(mockTenantId);

      expect(result.totalCustomers).toBe(100);
      expect(result.totalOrders).toBe(250);
      expect(result.totalRevenue).toBe(15000.50);
      expect(prisma.customer.count).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
      });
      expect(prisma.order.count).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
      });
    });

    it('should return zeros when no data exists', async () => {
      // Mock cache miss
      mockCacheService.get = jest.fn().mockResolvedValue(null);
      mockCacheService.set = jest.fn().mockResolvedValue(true);

      // Mock empty database
      (prisma.customer.count as jest.Mock).mockResolvedValue(0);
      (prisma.order.count as jest.Mock).mockResolvedValue(0);
      (prisma.order.aggregate as jest.Mock).mockResolvedValue({
        _sum: { totalPrice: null },
      });

      const result = await analyticsService.getMetrics(mockTenantId);

      expect(result.totalCustomers).toBe(0);
      expect(result.totalOrders).toBe(0);
      expect(result.totalRevenue).toBe(0);
    });
  });

  describe('getOrdersByDate', () => {
    it('should return orders grouped by date', async () => {
      const mockOrders = [
        { orderDate: new Date('2024-01-01'), totalPrice: 100 },
        { orderDate: new Date('2024-01-01'), totalPrice: 150 },
        { orderDate: new Date('2024-01-02'), totalPrice: 200 },
      ];

      (prisma.order.findMany as jest.Mock).mockResolvedValue(mockOrders);

      const result = await analyticsService.getOrdersByDate(mockTenantId);

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2024-01-01');
      expect(result[0].orderCount).toBe(2);
      expect(result[0].revenue).toBe(250);
      expect(result[1].date).toBe('2024-01-02');
      expect(result[1].orderCount).toBe(1);
      expect(result[1].revenue).toBe(200);
    });

    it('should filter by start date', async () => {
      const startDate = new Date('2024-01-01');
      const mockOrders = [
        { orderDate: new Date('2024-01-02'), totalPrice: 100 },
      ];

      (prisma.order.findMany as jest.Mock).mockResolvedValue(mockOrders);

      await analyticsService.getOrdersByDate(mockTenantId, startDate);

      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          orderDate: { gte: startDate },
        },
        select: { orderDate: true, totalPrice: true },
        orderBy: { orderDate: 'asc' },
      });
    });

    it('should filter by end date', async () => {
      const endDate = new Date('2024-01-31');
      const mockOrders: any[] = [];

      (prisma.order.findMany as jest.Mock).mockResolvedValue(mockOrders);

      await analyticsService.getOrdersByDate(mockTenantId, undefined, endDate);

      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          orderDate: { lte: endDate },
        },
        select: { orderDate: true, totalPrice: true },
        orderBy: { orderDate: 'asc' },
      });
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const mockOrders: any[] = [];

      (prisma.order.findMany as jest.Mock).mockResolvedValue(mockOrders);

      await analyticsService.getOrdersByDate(mockTenantId, startDate, endDate);

      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          orderDate: { gte: startDate, lte: endDate },
        },
        select: { orderDate: true, totalPrice: true },
        orderBy: { orderDate: 'asc' },
      });
    });
  });

  describe('getTopCustomers', () => {
    it('should return top 5 customers by spend', async () => {
      const mockGroupBy = [
        { customerId: 'cust-1', _sum: { totalPrice: 1000 } },
        { customerId: 'cust-2', _sum: { totalPrice: 800 } },
        { customerId: 'cust-3', _sum: { totalPrice: 600 } },
      ];

      const mockCustomers = [
        { id: 'cust-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        { id: 'cust-2', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
        { id: 'cust-3', firstName: 'Bob', lastName: null, email: 'bob@example.com' },
      ];

      (prisma.order.groupBy as jest.Mock).mockResolvedValue(mockGroupBy);
      (prisma.customer.findMany as jest.Mock).mockResolvedValue(mockCustomers);

      const result = await analyticsService.getTopCustomers(mockTenantId);

      expect(result).toHaveLength(3);
      expect(result[0].customerId).toBe('cust-1');
      expect(result[0].customerName).toBe('John Doe');
      expect(result[0].totalSpend).toBe(1000);
      expect(result[1].customerName).toBe('Jane Smith');
      expect(result[2].customerName).toBe('Bob');
    });

    it('should handle customers with no name', async () => {
      const mockGroupBy = [
        { customerId: 'cust-1', _sum: { totalPrice: 500 } },
      ];

      const mockCustomers = [
        { id: 'cust-1', firstName: null, lastName: null, email: 'unknown@example.com' },
      ];

      (prisma.order.groupBy as jest.Mock).mockResolvedValue(mockGroupBy);
      (prisma.customer.findMany as jest.Mock).mockResolvedValue(mockCustomers);

      const result = await analyticsService.getTopCustomers(mockTenantId);

      expect(result[0].customerName).toBe('Unknown');
    });

    it('should respect custom limit', async () => {
      const mockGroupBy: any[] = [];
      const mockCustomers: any[] = [];

      (prisma.order.groupBy as jest.Mock).mockResolvedValue(mockGroupBy);
      (prisma.customer.findMany as jest.Mock).mockResolvedValue(mockCustomers);

      await analyticsService.getTopCustomers(mockTenantId, 10);

      expect(prisma.order.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 })
      );
    });
  });

  describe('getRevenueTrend', () => {
    it('should return revenue grouped by date', async () => {
      const mockOrders = [
        { orderDate: new Date('2024-01-01'), totalPrice: 100 },
        { orderDate: new Date('2024-01-01'), totalPrice: 150 },
        { orderDate: new Date('2024-01-02'), totalPrice: 200 },
      ];

      (prisma.order.findMany as jest.Mock).mockResolvedValue(mockOrders);

      const result = await analyticsService.getRevenueTrend(mockTenantId);

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2024-01-01');
      expect(result[0].value).toBe(250);
      expect(result[1].date).toBe('2024-01-02');
      expect(result[1].value).toBe(200);
    });
  });

  describe('getCustomerTrend', () => {
    it('should return customer acquisition grouped by date', async () => {
      const mockCustomers = [
        { createdAt: new Date('2024-01-01') },
        { createdAt: new Date('2024-01-01') },
        { createdAt: new Date('2024-01-02') },
      ];

      (prisma.customer.findMany as jest.Mock).mockResolvedValue(mockCustomers);

      const result = await analyticsService.getCustomerTrend(mockTenantId);

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2024-01-01');
      expect(result[0].value).toBe(2);
      expect(result[1].date).toBe('2024-01-02');
      expect(result[1].value).toBe(1);
    });
  });
});
