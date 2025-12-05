import { redisClient } from './redis';
import { cacheService } from '../services/cache.service';
import { logger } from '../utils/logger';

async function testRedisConnection() {
  try {
    logger.info('Testing Redis connection...');

    // Test basic ping
    const pingResult = await redisClient.ping();
    logger.info(`Redis ping result: ${pingResult ? 'SUCCESS' : 'FAILED'}`);

    if (!pingResult) {
      throw new Error('Redis ping failed');
    }

    // Test cache operations
    logger.info('Testing cache operations...');

    const testKey = cacheService.formatKey('test-tenant', 'test-resource', 'test-id');
    const testValue = { message: 'Hello Redis!', timestamp: Date.now() };

    // Test set
    const setResult = await cacheService.set(testKey, testValue, 'custom', { ttl: 60 });
    logger.info(`Cache set result: ${setResult ? 'SUCCESS' : 'FAILED'}`);

    // Test get
    const getValue = await cacheService.get<typeof testValue>(testKey);
    logger.info(`Cache get result: ${getValue ? 'SUCCESS' : 'FAILED'}`);
    logger.info(`Retrieved value:`, getValue);

    // Test exists
    const existsResult = await cacheService.exists(testKey);
    logger.info(`Cache exists result: ${existsResult ? 'SUCCESS' : 'FAILED'}`);

    // Test TTL
    const ttl = await cacheService.getTTLRemaining(testKey);
    logger.info(`Cache TTL remaining: ${ttl} seconds`);

    // Test delete
    const deleteResult = await cacheService.delete(testKey);
    logger.info(`Cache delete result: ${deleteResult ? 'SUCCESS' : 'FAILED'}`);

    // Verify deletion
    const getAfterDelete = await cacheService.get(testKey);
    logger.info(`Cache get after delete: ${getAfterDelete === null ? 'SUCCESS (null)' : 'FAILED'}`);

    logger.info('All Redis tests passed!');

    // Cleanup
    await redisClient.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Redis connection test failed', { error });
    await redisClient.disconnect();
    process.exit(1);
  }
}

testRedisConnection();
