import { withTransaction, withTransactionRetry } from '../prisma';
import prisma from '../prisma';

// Mock the logger to avoid console output during tests
jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Database Transaction Wrapper', () => {
  describe('withTransaction', () => {
    it('should execute operations within a transaction', async () => {
      const result = await withTransaction(async (tx) => {
        // Simple query to test transaction
        const count = await tx.tenant.count();
        return count;
      });

      expect(typeof result).toBe('number');
    });

    it('should rollback on error', async () => {
      const initialCount = await prisma.tenant.count();

      try {
        await withTransaction(async (tx) => {
          // This should fail due to missing required fields
          await tx.tenant.create({
            data: {
              shopDomain: 'test-rollback.myshopify.com',
              accessToken: 'test-token',
            } as any,
          });

          // Force an error
          throw new Error('Intentional error for rollback test');
        });
      } catch (error) {
        // Expected to throw
      }

      // Verify no new tenant was created (rollback worked)
      const finalCount = await prisma.tenant.count();
      expect(finalCount).toBe(initialCount);
    });

    it('should return the result from the transaction', async () => {
      const result = await withTransaction(async (_tx) => {
        return { success: true, data: 'test' };
      });

      expect(result).toEqual({ success: true, data: 'test' });
    });
  });

  describe('withTransactionRetry', () => {
    it('should execute operations within a transaction with retry', async () => {
      const result = await withTransactionRetry(async (tx) => {
        const count = await tx.tenant.count();
        return count;
      });

      expect(typeof result).toBe('number');
    });

    it('should succeed on first attempt if no errors', async () => {
      const result = await withTransactionRetry(
        async (_tx) => {
          return { success: true };
        },
        3,
        100
      );

      expect(result).toEqual({ success: true });
    });

    it('should throw error after max retries for non-retryable errors', async () => {
      await expect(
        withTransactionRetry(
          async (_tx) => {
            throw new Error('Non-retryable error');
          },
          2,
          10
        )
      ).rejects.toThrow('Non-retryable error');
    });
  });
});
