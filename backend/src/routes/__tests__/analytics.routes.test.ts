import request from 'supertest';
import express, { Application } from 'express';
import analyticsRoutes from '../analytics.routes';

// Mock the authenticate middleware
jest.mock('../../middleware/auth.middleware', () => ({
  authenticate: jest.fn((req, _res, next) => {
    req.user = {
      userId: 'test-user-id',
      tenantId: 'test-tenant-id',
      email: 'test@example.com',
    };
    next();
  }),
}));

// Mock the analytics service
jest.mock('../../services/analytics.service', () => ({
  AnalyticsService: jest.fn().mockImplementation(() => ({
    getMetrics: jest.fn().mockResolvedValue({
      totalCustomers: 100,
      totalOrders: 50,
      totalRevenue: 5000,
    }),
    getOrdersByDate: jest.fn().mockResolvedValue([
      { date: '2024-01-01', orderCount: 10, revenue: 1000 },
      { date: '2024-01-02', orderCount: 15, revenue: 1500 },
    ]),
    getTopCustomers: jest.fn().mockResolvedValue([
      {
        customerId: 'customer-1',
        customerName: 'John Doe',
        email: 'john@example.com',
        totalSpend: 1000,
      },
    ]),
    getRevenueTrend: jest.fn().mockResolvedValue([
      { date: '2024-01-01', value: 1000 },
      { date: '2024-01-02', value: 1500 },
    ]),
    getCustomerTrend: jest.fn().mockResolvedValue([
      { date: '2024-01-01', value: 5 },
      { date: '2024-01-02', value: 10 },
    ]),
  })),
}));

describe('Analytics Routes', () => {
  let app: Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/analytics', analyticsRoutes);
  });

  describe('GET /api/analytics/metrics', () => {
    it('should return aggregate metrics', async () => {
      const response = await request(app).get('/api/analytics/metrics');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: {
          totalCustomers: 100,
          totalOrders: 50,
          totalRevenue: 5000,
        },
      });
    });
  });

  describe('GET /api/analytics/orders-by-date', () => {
    it('should return orders grouped by date', async () => {
      const response = await request(app).get('/api/analytics/orders-by-date');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should accept date range parameters', async () => {
      const response = await request(app)
        .get('/api/analytics/orders-by-date')
        .query({ startDate: '2024-01-01', endDate: '2024-01-31' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid date format', async () => {
      const response = await request(app)
        .get('/api/analytics/orders-by-date')
        .query({ startDate: 'invalid-date' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/analytics/top-customers', () => {
    it('should return top customers by spend', async () => {
      const response = await request(app).get('/api/analytics/top-customers');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toHaveProperty('customerName');
      expect(response.body.data[0]).toHaveProperty('totalSpend');
    });
  });

  describe('GET /api/analytics/revenue-trend', () => {
    it('should return revenue trend data', async () => {
      const response = await request(app).get('/api/analytics/revenue-trend');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should accept date range parameters', async () => {
      const response = await request(app)
        .get('/api/analytics/revenue-trend')
        .query({ startDate: '2024-01-01', endDate: '2024-01-31' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/analytics/customer-trend', () => {
    it('should return customer acquisition trend data', async () => {
      const response = await request(app).get('/api/analytics/customer-trend');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should accept date range parameters', async () => {
      const response = await request(app)
        .get('/api/analytics/customer-trend')
        .query({ startDate: '2024-01-01', endDate: '2024-01-31' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
