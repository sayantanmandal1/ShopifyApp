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

export default prisma;
