import { redisClient } from '../db/redis';
import { config } from '../config';
import { logger } from '../utils/logger';

export type ResourceType = 'metrics' | 'customers' | 'products' | 'orders' | 'session' | 'custom';

interface CacheOptions {
  ttl?: number;
}

/**
 * Cache service for managing Redis cache operations
 */
export class CacheService {
  /**
   * Get TTL for a specific resource type
   */
  private getTTL(resourceType: ResourceType, customTTL?: number): number {
    if (customTTL !== undefined) {
      return customTTL;
    }

    switch (resourceType) {
      case 'metrics':
        return config.cache.ttlMetrics;
      case 'customers':
        return config.cache.ttlCustomers;
      case 'products':
        return config.cache.ttlProducts;
      case 'orders':
        return config.cache.ttlOrders;
      case 'session':
        return config.session.ttl;
      case 'custom':
        return 300; // 5 minutes default
      default:
        return 300;
    }
  }

  /**
   * Format cache key with tenant isolation
   * Format: {tenant_id}:{resource}:{id}
   */
  public formatKey(tenantId: string, resource: string, id?: string): string {
    if (id) {
      return `${tenantId}:${resource}:${id}`;
    }
    return `${tenantId}:${resource}`;
  }

  /**
   * Get value from cache
   */
  public async get<T>(key: string): Promise<T | null> {
    try {
      const client = redisClient.getClient();
      const value = await client.get(key);
      
      if (!value) {
        logger.debug(`Cache miss for key: ${key}`);
        return null;
      }

      logger.debug(`Cache hit for key: ${key}`);
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Cache get error', { key, error });
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  public async set(
    key: string,
    value: unknown,
    resourceType: ResourceType,
    options?: CacheOptions
  ): Promise<boolean> {
    try {
      const client = redisClient.getClient();
      const ttl = this.getTTL(resourceType, options?.ttl);
      const serialized = JSON.stringify(value);
      
      await client.setex(key, ttl, serialized);
      
      logger.debug(`Cache set for key: ${key} with TTL: ${ttl}s`);
      return true;
    } catch (error) {
      logger.error('Cache set error', { key, error });
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  public async delete(key: string): Promise<boolean> {
    try {
      const client = redisClient.getClient();
      const result = await client.del(key);
      
      logger.debug(`Cache delete for key: ${key}, deleted: ${result > 0}`);
      return result > 0;
    } catch (error) {
      logger.error('Cache delete error', { key, error });
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   * Useful for cache invalidation
   */
  public async deletePattern(pattern: string): Promise<number> {
    try {
      const client = redisClient.getClient();
      
      // Use SCAN to find keys matching pattern (safer than KEYS for production)
      const keys: string[] = [];
      let cursor = '0';
      
      do {
        const [nextCursor, foundKeys] = await client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100
        );
        cursor = nextCursor;
        keys.push(...foundKeys);
      } while (cursor !== '0');

      if (keys.length === 0) {
        logger.debug(`No keys found matching pattern: ${pattern}`);
        return 0;
      }

      // Delete all found keys
      const result = await client.del(...keys);
      
      logger.debug(`Cache delete pattern: ${pattern}, deleted ${result} keys`);
      return result;
    } catch (error) {
      logger.error('Cache delete pattern error', { pattern, error });
      return 0;
    }
  }

  /**
   * Invalidate all cache entries for a tenant
   */
  public async invalidateTenant(tenantId: string): Promise<number> {
    const pattern = `${tenantId}:*`;
    return this.deletePattern(pattern);
  }

  /**
   * Invalidate all cache entries for a specific resource type within a tenant
   */
  public async invalidateResource(tenantId: string, resource: string): Promise<number> {
    const pattern = `${tenantId}:${resource}:*`;
    return this.deletePattern(pattern);
  }

  /**
   * Check if a key exists in cache
   */
  public async exists(key: string): Promise<boolean> {
    try {
      const client = redisClient.getClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error', { key, error });
      return false;
    }
  }

  /**
   * Get remaining TTL for a key
   */
  public async getTTLRemaining(key: string): Promise<number> {
    try {
      const client = redisClient.getClient();
      const ttl = await client.ttl(key);
      return ttl;
    } catch (error) {
      logger.error('Cache TTL error', { key, error });
      return -1;
    }
  }

  /**
   * Set value in cache only if it doesn't exist (atomic operation)
   */
  public async setIfNotExists(
    key: string,
    value: unknown,
    resourceType: ResourceType,
    options?: CacheOptions
  ): Promise<boolean> {
    try {
      const client = redisClient.getClient();
      const ttl = this.getTTL(resourceType, options?.ttl);
      const serialized = JSON.stringify(value);
      
      const result = await client.set(key, serialized, 'EX', ttl, 'NX');
      
      if (result === 'OK') {
        logger.debug(`Cache setIfNotExists succeeded for key: ${key}`);
        return true;
      }
      
      logger.debug(`Cache setIfNotExists failed (key exists): ${key}`);
      return false;
    } catch (error) {
      logger.error('Cache setIfNotExists error', { key, error });
      return false;
    }
  }

  /**
   * Increment a counter in cache
   */
  public async increment(key: string, amount: number = 1): Promise<number> {
    try {
      const client = redisClient.getClient();
      const result = await client.incrby(key, amount);
      logger.debug(`Cache increment for key: ${key}, new value: ${result}`);
      return result;
    } catch (error) {
      logger.error('Cache increment error', { key, error });
      throw error;
    }
  }

  /**
   * Get multiple values from cache
   */
  public async getMultiple<T>(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    
    if (keys.length === 0) {
      return results;
    }

    try {
      const client = redisClient.getClient();
      const values = await client.mget(...keys);
      
      keys.forEach((key, index) => {
        const value = values[index];
        if (value) {
          try {
            results.set(key, JSON.parse(value) as T);
          } catch (parseError) {
            logger.error('Cache parse error for key', { key, parseError });
          }
        }
      });
      
      logger.debug(`Cache getMultiple: ${results.size}/${keys.length} hits`);
      return results;
    } catch (error) {
      logger.error('Cache getMultiple error', { error });
      return results;
    }
  }

  /**
   * Clear all cache (use with caution!)
   */
  public async clearAll(): Promise<boolean> {
    try {
      const client = redisClient.getClient();
      await client.flushdb();
      logger.warn('Cache cleared (FLUSHDB)');
      return true;
    } catch (error) {
      logger.error('Cache clearAll error', { error });
      return false;
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();
