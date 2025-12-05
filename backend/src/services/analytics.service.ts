import prisma from '../db/prisma';
import { CacheService } from './cache.service';

const cacheService = new CacheService();

export interface Metrics {
  totalCustomers: number;
  totalOrders: number;
  totalRevenue: number;
}

export interface OrdersByDate {
  date: string;
  orderCount: number;
  revenue: number;
}

export interface CustomerSpend {
  customerId: string;
  customerName: string;
  email: string | null;
  totalSpend: number;
}

export interface TrendData {
  date: string;
  value: number;
}

export class AnalyticsService {
  /**
   * Get aggregate metrics for a tenant
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
   */
  async getMetrics(tenantId: string): Promise<Metrics> {
    // Check cache first
    const cacheKey = `${tenantId}:metrics`;
    const cached = await cacheService.get<Metrics>(cacheKey);
    if (cached) {
      return cached;
    }

    // Calculate total customers
    const totalCustomers = await prisma.customer.count({
      where: { tenantId },
    });

    // Calculate total orders
    const totalOrders = await prisma.order.count({
      where: { tenantId },
    });

    // Calculate total revenue
    const revenueResult = await prisma.order.aggregate({
      where: { tenantId },
      _sum: {
        totalPrice: true,
      },
    });

    const totalRevenue = revenueResult._sum.totalPrice
      ? Number(revenueResult._sum.totalPrice)
      : 0;

    const metrics: Metrics = {
      totalCustomers,
      totalOrders,
      totalRevenue,
    };

    // Cache for 5 minutes
    await cacheService.set(cacheKey, metrics, 'metrics');

    return metrics;
  }

  /**
   * Get orders grouped by date with optional date range filtering
   * Requirements: 8.1, 8.2, 8.3, 8.5
   */
  async getOrdersByDate(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<OrdersByDate[]> {
    // Build where clause with tenant filter
    const where: any = { tenantId };

    // Add date range filters if provided
    if (startDate || endDate) {
      where.orderDate = {};
      if (startDate) {
        where.orderDate.gte = startDate;
      }
      if (endDate) {
        where.orderDate.lte = endDate;
      }
    }

    // Fetch orders with date filtering
    const orders = await prisma.order.findMany({
      where,
      select: {
        orderDate: true,
        totalPrice: true,
      },
      orderBy: {
        orderDate: 'asc',
      },
    });

    // Group by date
    const groupedByDate = new Map<string, { count: number; revenue: number }>();

    for (const order of orders) {
      const dateKey = order.orderDate.toISOString().split('T')[0];
      const existing = groupedByDate.get(dateKey) || { count: 0, revenue: 0 };
      groupedByDate.set(dateKey, {
        count: existing.count + 1,
        revenue: existing.revenue + Number(order.totalPrice),
      });
    }

    // Convert to array
    const result: OrdersByDate[] = Array.from(groupedByDate.entries()).map(
      ([date, data]) => ({
        date,
        orderCount: data.count,
        revenue: data.revenue,
      })
    );

    return result;
  }

  /**
   * Get top customers by total spend
   * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
   */
  async getTopCustomers(
    tenantId: string,
    limit: number = 5
  ): Promise<CustomerSpend[]> {
    // Calculate total spend per customer using aggregation
    const customerSpends = await prisma.order.groupBy({
      by: ['customerId'],
      where: {
        tenantId,
        customerId: { not: null },
      },
      _sum: {
        totalPrice: true,
      },
      orderBy: {
        _sum: {
          totalPrice: 'desc',
        },
      },
      take: limit,
    });

    // Fetch customer details
    const customerIds = customerSpends
      .map((cs) => cs.customerId)
      .filter((id): id is string => id !== null);

    const customers = await prisma.customer.findMany({
      where: {
        id: { in: customerIds },
        tenantId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    // Create a map for quick lookup
    const customerMap = new Map(customers.map((c) => [c.id, c]));

    // Combine data
    const result: CustomerSpend[] = customerSpends
      .map((cs) => {
        if (!cs.customerId) return null;
        const customer = customerMap.get(cs.customerId);
        if (!customer) return null;

        const customerName = [customer.firstName, customer.lastName]
          .filter(Boolean)
          .join(' ') || 'Unknown';

        return {
          customerId: cs.customerId,
          customerName,
          email: customer.email,
          totalSpend: Number(cs._sum.totalPrice || 0),
        };
      })
      .filter((item): item is CustomerSpend => item !== null);

    return result;
  }

  /**
   * Get revenue trend over time
   * Requirements: 10.1, 10.2, 10.5
   */
  async getRevenueTrend(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<TrendData[]> {
    // Build where clause
    const where: any = { tenantId };

    if (startDate || endDate) {
      where.orderDate = {};
      if (startDate) {
        where.orderDate.gte = startDate;
      }
      if (endDate) {
        where.orderDate.lte = endDate;
      }
    }

    // Fetch orders
    const orders = await prisma.order.findMany({
      where,
      select: {
        orderDate: true,
        totalPrice: true,
      },
      orderBy: {
        orderDate: 'asc',
      },
    });

    // Group by date and sum revenue
    const groupedByDate = new Map<string, number>();

    for (const order of orders) {
      const dateKey = order.orderDate.toISOString().split('T')[0];
      const existing = groupedByDate.get(dateKey) || 0;
      groupedByDate.set(dateKey, existing + Number(order.totalPrice));
    }

    // Convert to array
    const result: TrendData[] = Array.from(groupedByDate.entries()).map(
      ([date, value]) => ({
        date,
        value,
      })
    );

    return result;
  }

  /**
   * Get customer acquisition trend over time
   * Requirements: 10.1, 10.2, 10.5
   */
  async getCustomerTrend(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<TrendData[]> {
    // Build where clause
    const where: any = { tenantId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    // Fetch customers
    const customers = await prisma.customer.findMany({
      where,
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group by date and count
    const groupedByDate = new Map<string, number>();

    for (const customer of customers) {
      const dateKey = customer.createdAt.toISOString().split('T')[0];
      const existing = groupedByDate.get(dateKey) || 0;
      groupedByDate.set(dateKey, existing + 1);
    }

    // Convert to array
    const result: TrendData[] = Array.from(groupedByDate.entries()).map(
      ([date, value]) => ({
        date,
        value,
      })
    );

    return result;
  }

  /**
   * Get average order value trend over time
   * Requirements: 10.1, 10.2
   */
  async getAverageOrderValueTrend(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<TrendData[]> {
    // Build where clause
    const where: any = { tenantId };

    if (startDate || endDate) {
      where.orderDate = {};
      if (startDate) {
        where.orderDate.gte = startDate;
      }
      if (endDate) {
        where.orderDate.lte = endDate;
      }
    }

    // Fetch orders
    const orders = await prisma.order.findMany({
      where,
      select: {
        orderDate: true,
        totalPrice: true,
      },
      orderBy: {
        orderDate: 'asc',
      },
    });

    // Group by date and calculate average
    const groupedByDate = new Map<string, { sum: number; count: number }>();

    for (const order of orders) {
      const dateKey = order.orderDate.toISOString().split('T')[0];
      const existing = groupedByDate.get(dateKey) || { sum: 0, count: 0 };
      groupedByDate.set(dateKey, {
        sum: existing.sum + Number(order.totalPrice),
        count: existing.count + 1,
      });
    }

    // Convert to array with averages
    const result: TrendData[] = Array.from(groupedByDate.entries()).map(
      ([date, data]) => ({
        date,
        value: data.count > 0 ? data.sum / data.count : 0,
      })
    );

    return result;
  }

  /**
   * Get orders grouped by fulfillment status
   * Requirements: 10.1
   */
  async getOrdersByFulfillmentStatus(tenantId: string): Promise<
    Array<{ status: string; count: number }>
  > {
    const orders = await prisma.order.groupBy({
      by: ['fulfillmentStatus'],
      where: { tenantId },
      _count: {
        id: true,
      },
    });

    return orders.map((order) => ({
      status: order.fulfillmentStatus || 'unfulfilled',
      count: order._count.id,
    }));
  }

  /**
   * Get top products by revenue
   * Requirements: 10.1
   */
  async getTopProductsByRevenue(
    tenantId: string,
    limit: number = 5
  ): Promise<
    Array<{ productId: string; productTitle: string; revenue: number }>
  > {
    // Get line items with product info
    const lineItems = await prisma.orderLineItem.findMany({
      where: {
        order: {
          tenantId,
        },
        productId: { not: null },
      },
      select: {
        productId: true,
        quantity: true,
        price: true,
        product: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Calculate revenue per product
    const productRevenue = new Map<string, { title: string; revenue: number }>();

    for (const item of lineItems) {
      if (!item.productId || !item.product) continue;

      const revenue = Number(item.price) * item.quantity;
      const existing = productRevenue.get(item.productId);

      if (existing) {
        existing.revenue += revenue;
      } else {
        productRevenue.set(item.productId, {
          title: item.product.title,
          revenue,
        });
      }
    }

    // Convert to array and sort
    const result = Array.from(productRevenue.entries())
      .map(([productId, data]) => ({
        productId,
        productTitle: data.title,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    return result;
  }
}
