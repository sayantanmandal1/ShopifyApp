import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { logger } from '../utils/logger';
import { config } from '../config';

// Create a singleton instance of PrismaClient
const prismaClientSingleton = () => {
  const pool = new Pool({ connectionString: config.database.url });
  const adapter = new PrismaPg(pool);
  
  return new PrismaClient({
    adapter,
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'stdout' },
      { level: 'warn', emit: 'stdout' },
    ],
  });
};

declare global {
  // eslint-disable-next-line no-var
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

// Log queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug(`Query: ${e.query}`);
    logger.debug(`Duration: ${e.duration}ms`);
  });
}

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

/**
 * Database transaction wrapper
 * Requirements: 12.2, 12.4
 * 
 * Wraps multi-step operations in a transaction with automatic rollback on errors.
 * 
 * @param fn - Function containing database operations to execute in a transaction
 * @returns Promise resolving to the result of the transaction
 * @throws Error if transaction fails (after automatic rollback)
 * 
 * @example
 * const result = await withTransaction(async (tx) => {
 *   const user = await tx.user.create({ data: { email: 'test@example.com' } });
 *   const profile = await tx.profile.create({ data: { userId: user.id } });
 *   return { user, profile };
 * });
 */
export async function withTransaction<T>(
  fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
): Promise<T> {
  try {
    logger.debug('Starting database transaction');
    
    const result = await prisma.$transaction(async (tx) => {
      return await fn(tx);
    });
    
    logger.debug('Transaction completed successfully');
    return result;
  } catch (error) {
    // Transaction automatically rolled back by Prisma
    logger.error('Transaction failed and rolled back:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Re-throw the error to be handled by the error middleware
    throw error;
  }
}

/**
 * Database transaction wrapper with retry logic
 * Requirements: 12.2, 12.4, 12.5
 * 
 * Wraps multi-step operations in a transaction with automatic rollback on errors
 * and retry logic with exponential backoff for transient failures.
 * 
 * @param fn - Function containing database operations to execute in a transaction
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param baseDelay - Base delay in milliseconds for exponential backoff (default: 1000)
 * @returns Promise resolving to the result of the transaction
 * @throws Error if transaction fails after all retries
 * 
 * @example
 * const result = await withTransactionRetry(async (tx) => {
 *   const order = await tx.order.create({ data: { ... } });
 *   const items = await tx.orderLineItem.createMany({ data: [...] });
 *   return { order, items };
 * }, 3, 1000);
 */
export async function withTransactionRetry<T>(
  fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Calculate exponential backoff with jitter
        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 60000);
        const jitter = Math.random() * 1000;
        const totalDelay = delay + jitter;
        
        logger.info(`Retrying transaction (attempt ${attempt + 1}/${maxRetries + 1}) after ${Math.round(totalDelay)}ms`);
        await new Promise(resolve => setTimeout(resolve, totalDelay));
      }
      
      return await withTransaction(fn);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // Check if error is retryable (connection errors, timeouts, etc.)
      const isRetryable = 
        error instanceof Error && (
          error.message.includes('connection') ||
          error.message.includes('timeout') ||
          error.message.includes('ECONNREFUSED') ||
          error.message.includes('ETIMEDOUT') ||
          (error as any).code === 'P1001' || // Prisma connection error
          (error as any).code === 'P1002' || // Prisma timeout
          (error as any).code === 'P1008' || // Prisma operation timeout
          (error as any).code === 'P1017'    // Prisma server closed connection
        );
      
      if (!isRetryable || attempt === maxRetries) {
        logger.error(`Transaction failed after ${attempt + 1} attempts`, {
          error: lastError.message,
          isRetryable,
        });
        throw lastError;
      }
      
      logger.warn(`Transaction attempt ${attempt + 1} failed with retryable error:`, {
        error: lastError.message,
      });
    }
  }
  
  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Transaction failed');
}

export default prisma;
