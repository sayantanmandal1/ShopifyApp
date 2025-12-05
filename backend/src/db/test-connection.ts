import prisma from './prisma';
import { logger } from '../utils/logger';

async function testConnection() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('✓ Database connection successful');

    // Test query
    const tenantCount = await prisma.tenant.count();
    logger.info(`✓ Found ${tenantCount} tenant(s) in database`);

    const customerCount = await prisma.customer.count();
    logger.info(`✓ Found ${customerCount} customer(s) in database`);

    const orderCount = await prisma.order.count();
    logger.info(`✓ Found ${orderCount} order(s) in database`);

    logger.info('✓ All database tests passed!');
  } catch (error) {
    logger.error('✗ Database connection failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
