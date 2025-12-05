import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { config } from '../index';

describe('Configuration Module', () => {
  it('should load configuration from environment variables', () => {
    expect(config).toBeDefined();
    expect(config.nodeEnv).toBeDefined();
    expect(config.port).toBeDefined();
    expect(config.database).toBeDefined();
    expect(config.redis).toBeDefined();
    expect(config.auth).toBeDefined();
    expect(config.encryption).toBeDefined();
  });

  it('should have database configuration', () => {
    expect(config.database.host).toBeDefined();
    expect(config.database.port).toBeGreaterThan(0);
    expect(config.database.user).toBeDefined();
    expect(config.database.database).toBeDefined();
    expect(config.database.url).toBeDefined();
  });

  it('should have redis configuration', () => {
    expect(config.redis.host).toBeDefined();
    expect(config.redis.port).toBeGreaterThan(0);
  });

  it('should have auth configuration', () => {
    expect(config.auth.jwtSecret).toBeDefined();
    expect(config.auth.jwtExpiration).toBeDefined();
    expect(config.auth.bcryptSaltRounds).toBeGreaterThanOrEqual(10);
  });

  it('should have encryption configuration', () => {
    expect(config.encryption.key).toBeDefined();
    expect(config.encryption.key.length).toBeGreaterThan(0);
  });

  it('should have default values for optional variables', () => {
    // These should have defaults even if not set in env
    expect(config.nodeEnv).toBeDefined(); // Will be 'test' in Jest environment
    expect(config.port).toBe(3001);
    expect(config.cache.ttlMetrics).toBe(300);
    expect(config.cache.ttlCustomers).toBe(900);
    expect(config.cache.ttlProducts).toBe(1800);
    expect(config.cache.ttlOrders).toBe(600);
  });

  it('should have session configuration', () => {
    expect(config.session.ttl).toBeGreaterThan(0);
  });

  it('should have cache TTL configuration', () => {
    expect(config.cache.ttlMetrics).toBeGreaterThan(0);
    expect(config.cache.ttlCustomers).toBeGreaterThan(0);
    expect(config.cache.ttlProducts).toBeGreaterThan(0);
    expect(config.cache.ttlOrders).toBeGreaterThan(0);
  });

  it('should have rate limiting configuration', () => {
    expect(config.rateLimit.windowMs).toBeGreaterThan(0);
    expect(config.rateLimit.maxRequests).toBeGreaterThan(0);
  });

  it('should have Shopify API configuration', () => {
    expect(config.shopify.apiVersion).toBeDefined();
  });

  it('should have job queue configuration', () => {
    expect(config.jobQueue.concurrency).toBeGreaterThan(0);
    expect(config.jobQueue.maxRetries).toBeGreaterThan(0);
  });
});
