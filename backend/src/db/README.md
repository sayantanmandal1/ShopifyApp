# Database and Cache Layer

## Redis Connection

The Redis client is implemented in `redis.ts` with the following features:

### Features
- **Singleton Pattern**: Single Redis client instance shared across the application
- **Connection Pooling**: Managed by ioredis library
- **Exponential Backoff**: Automatic retry with exponential backoff on connection failures
- **Jitter**: Random jitter (0-1000ms) added to prevent thundering herd
- **Max Retries**: Configurable maximum reconnection attempts (default: 10)
- **Event Logging**: Comprehensive logging of connection events

### Configuration
Redis connection is configured via environment variables:
- `REDIS_HOST`: Redis server host (default: localhost)
- `REDIS_PORT`: Redis server port (default: 6379)
- `REDIS_PASSWORD`: Redis password (optional)

### Usage
```typescript
import { redisClient } from './db/redis';

// Get the client instance
const client = redisClient.getClient();

// Test connection
const isConnected = await redisClient.ping();

// Disconnect gracefully
await redisClient.disconnect();
```

## Cache Service

The cache service is implemented in `services/cache.service.ts` with the following features:

### Features
- **Tenant Isolation**: Cache keys formatted as `{tenant_id}:{resource}:{id}`
- **TTL Management**: Different TTL values for different resource types
- **Cache Invalidation**: Pattern-based cache invalidation
- **Atomic Operations**: Support for setIfNotExists and increment operations
- **Batch Operations**: Get multiple keys in a single operation

### Resource Types and TTLs
- **metrics**: 5 minutes (300s)
- **customers**: 15 minutes (900s)
- **products**: 30 minutes (1800s)
- **orders**: 10 minutes (600s)
- **session**: 24 hours (86400s)
- **custom**: 5 minutes (300s) - default

### Usage Examples

#### Basic Operations
```typescript
import { cacheService } from './services/cache.service';

// Format a cache key
const key = cacheService.formatKey('tenant-123', 'customers', 'cust-456');

// Set a value
await cacheService.set(key, { name: 'John Doe' }, 'customers');

// Get a value
const customer = await cacheService.get<Customer>(key);

// Delete a value
await cacheService.delete(key);
```

#### Cache Invalidation
```typescript
// Invalidate all cache for a tenant
await cacheService.invalidateTenant('tenant-123');

// Invalidate specific resource type
await cacheService.invalidateResource('tenant-123', 'customers');

// Delete by pattern
await cacheService.deletePattern('tenant-123:orders:*');
```

#### Advanced Operations
```typescript
// Set only if not exists (atomic)
const success = await cacheService.setIfNotExists(key, value, 'custom');

// Increment a counter
const newValue = await cacheService.increment('tenant-123:counter');

// Get multiple keys
const keys = ['key1', 'key2', 'key3'];
const results = await cacheService.getMultiple<Customer>(keys);

// Check if key exists
const exists = await cacheService.exists(key);

// Get remaining TTL
const ttl = await cacheService.getTTLRemaining(key);
```

## Testing

Run the Redis connection test:
```bash
npx tsx src/db/test-redis-connection.ts
```

This will test:
- Redis connection and ping
- Cache set/get/delete operations
- TTL management
- Key existence checks

## Requirements Validation

This implementation satisfies:
- **Requirement 13.1**: Redis connection with environment variable configuration
- **Requirement 12.5**: Connection retry logic with exponential backoff
- **Requirement 13.2**: Cache-first data retrieval
- **Requirement 13.3**: Cache population on database query
- **Requirement 13.5**: Cache expiration fallback to database
