import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env' });

interface Config {
  nodeEnv: string;
  port: number;
  frontendUrl: string;
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    url: string;
  };
  redis: {
    host: string;
    port: number;
    password: string;
  };
  auth: {
    jwtSecret: string;
    jwtExpiration: string;
    bcryptSaltRounds: number;
  };
  encryption: {
    key: string;
  };
  session: {
    ttl: number;
  };
  cache: {
    ttlMetrics: number;
    ttlCustomers: number;
    ttlProducts: number;
    ttlOrders: number;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  shopify: {
    apiVersion: string;
  };
  jobQueue: {
    concurrency: number;
    maxRetries: number;
  };
  logging: {
    level: string;
  };
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value as string;
};

const getEnvVarAsNumber = (key: string, defaultValue?: number): number => {
  const value = process.env[key];
  if (!value) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Missing required environment variable: ${key}`);
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a number`);
  }
  return parsed;
};

export const config: Config = {
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  port: getEnvVarAsNumber('PORT', 3001),
  frontendUrl: getEnvVar('FRONTEND_URL', 'http://localhost:3000'),
  database: {
    host: getEnvVar('POSTGRES_HOST', 'localhost'),
    port: getEnvVarAsNumber('POSTGRES_PORT', 5432),
    user: getEnvVar('POSTGRES_USER', 'postgres'),
    password: getEnvVar('POSTGRES_PASSWORD', 'postgres'),
    database: getEnvVar('POSTGRES_DB', 'shopify_insights'),
    url: getEnvVar(
      'DATABASE_URL',
      'postgresql://postgres:postgres@localhost:5432/shopify_insights'
    ),
  },
  redis: {
    host: getEnvVar('REDIS_HOST', 'localhost'),
    port: getEnvVarAsNumber('REDIS_PORT', 6379),
    password: getEnvVar('REDIS_PASSWORD', ''),
  },
  auth: {
    jwtSecret: getEnvVar('JWT_SECRET'),
    jwtExpiration: getEnvVar('JWT_EXPIRATION', '24h'),
    bcryptSaltRounds: getEnvVarAsNumber('BCRYPT_SALT_ROUNDS', 12),
  },
  encryption: {
    key: getEnvVar('ENCRYPTION_KEY'),
  },
  session: {
    ttl: getEnvVarAsNumber('SESSION_TTL', 86400),
  },
  cache: {
    ttlMetrics: getEnvVarAsNumber('CACHE_TTL_METRICS', 300),
    ttlCustomers: getEnvVarAsNumber('CACHE_TTL_CUSTOMERS', 900),
    ttlProducts: getEnvVarAsNumber('CACHE_TTL_PRODUCTS', 1800),
    ttlOrders: getEnvVarAsNumber('CACHE_TTL_ORDERS', 600),
  },
  rateLimit: {
    windowMs: getEnvVarAsNumber('RATE_LIMIT_WINDOW_MS', 60000),
    maxRequests: getEnvVarAsNumber('RATE_LIMIT_MAX_REQUESTS', 100),
  },
  shopify: {
    apiVersion: getEnvVar('SHOPIFY_API_VERSION', '2024-01'),
  },
  jobQueue: {
    concurrency: getEnvVarAsNumber('JOB_QUEUE_CONCURRENCY', 5),
    maxRetries: getEnvVarAsNumber('JOB_QUEUE_MAX_RETRIES', 3),
  },
  logging: {
    level: getEnvVar('LOG_LEVEL', 'info'),
  },
};
