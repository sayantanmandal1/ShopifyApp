import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

class RedisClient {
  private client: Redis | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private readonly baseDelay = 1000; // 1 second
  private readonly maxDelay = 60000; // 60 seconds

  /**
   * Get the Redis client instance, creating it if necessary
   */
  public getClient(): Redis {
    if (!this.client) {
      this.connect();
    }
    return this.client!;
  }

  /**
   * Connect to Redis with retry logic and exponential backoff
   */
  private connect(): void {
    if (this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    const redisOptions = {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times: number) => {
        return this.calculateBackoff(times);
      },
      reconnectOnError: (err: Error) => {
        logger.error('Redis connection error', { error: err.message });
        return true;
      },
    };

    this.client = new Redis(redisOptions);

    this.client.on('connect', () => {
      logger.info('Redis client connecting...');
    });

    this.client.on('ready', () => {
      logger.info('Redis client connected and ready');
      this.reconnectAttempts = 0;
      this.isConnecting = false;
    });

    this.client.on('error', (err: Error) => {
      logger.error('Redis client error', { error: err.message });
    });

    this.client.on('close', () => {
      logger.warn('Redis connection closed');
    });

    this.client.on('reconnecting', (delay: number) => {
      this.reconnectAttempts++;
      logger.info(`Redis reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    });

    this.client.on('end', () => {
      logger.warn('Redis connection ended');
      this.isConnecting = false;
    });
  }

  /**
   * Calculate exponential backoff delay with jitter
   * @param attempt - The current retry attempt number
   * @returns Delay in milliseconds, or null to stop retrying
   */
  private calculateBackoff(attempt: number): number | null {
    if (attempt > this.maxReconnectAttempts) {
      logger.error(`Max reconnection attempts (${this.maxReconnectAttempts}) reached`);
      return null;
    }

    // Exponential backoff: baseDelay * 2^(attempt-1)
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt - 1);
    
    // Cap at maxDelay
    const cappedDelay = Math.min(exponentialDelay, this.maxDelay);
    
    // Add jitter (0-1000ms) to prevent thundering herd
    const jitter = Math.random() * 1000;
    
    const totalDelay = cappedDelay + jitter;
    
    logger.debug(`Retry attempt ${attempt}: delay ${totalDelay.toFixed(0)}ms`);
    
    return totalDelay;
  }

  /**
   * Test the Redis connection
   */
  public async ping(): Promise<boolean> {
    try {
      const result = await this.getClient().ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis ping failed', { error });
      return false;
    }
  }

  /**
   * Gracefully disconnect from Redis
   */
  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      logger.info('Redis client disconnected');
    }
  }

  /**
   * Force disconnect from Redis (for emergency situations)
   */
  public forceDisconnect(): void {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      logger.warn('Redis client force disconnected');
    }
  }
}

// Export singleton instance
export const redisClient = new RedisClient();

// Export the Redis type for use in other modules
export type { Redis };
