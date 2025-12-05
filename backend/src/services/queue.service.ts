import Queue, { Job, JobOptions } from 'bull';
import { config } from '../config';
import { logger } from '../utils/logger';
import { IngestionService } from './ingestion.service';

// Job data interfaces
export interface CustomerIngestionJobData {
  tenantId: string;
  type: 'customers';
}

export interface OrderIngestionJobData {
  tenantId: string;
  type: 'orders';
}

export interface ProductIngestionJobData {
  tenantId: string;
  type: 'products';
}

export type IngestionJobData =
  | CustomerIngestionJobData
  | OrderIngestionJobData
  | ProductIngestionJobData;

// Job result interface
export interface IngestionJobResult {
  count: number;
  errors: string[];
  completedAt: Date;
}

class QueueService {
  private ingestionQueue: Queue.Queue<IngestionJobData>;
  private ingestionService: IngestionService;

  constructor() {
    // Create Bull queue with Redis connection
    this.ingestionQueue = new Queue<IngestionJobData>('ingestion', {
      redis: {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password || undefined,
      },
      defaultJobOptions: {
        attempts: config.jobQueue.maxRetries,
        backoff: {
          type: 'exponential',
          delay: 1000, // Start with 1 second delay
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 200, // Keep last 200 failed jobs
      },
    });

    this.ingestionService = new IngestionService();

    // Set up event listeners
    this.setupEventListeners();

    // Start processing jobs
    this.startProcessors();
  }

  /**
   * Set up event listeners for queue monitoring
   */
  private setupEventListeners(): void {
    this.ingestionQueue.on('error', (error: Error) => {
      logger.error('Queue error', { error: error.message });
    });

    this.ingestionQueue.on('waiting', (jobId: string | number) => {
      logger.debug(`Job ${jobId} is waiting`);
    });

    this.ingestionQueue.on('active', (job: Job<IngestionJobData>) => {
      logger.info(`Job ${job.id} started processing`, {
        type: job.data.type,
        tenantId: job.data.tenantId,
      });
    });

    this.ingestionQueue.on('completed', (job: Job<IngestionJobData>, result: IngestionJobResult) => {
      logger.info(`Job ${job.id} completed`, {
        type: job.data.type,
        tenantId: job.data.tenantId,
        count: result.count,
        errors: result.errors.length,
      });
    });

    this.ingestionQueue.on('failed', (job: Job<IngestionJobData> | undefined, error: Error) => {
      logger.error(`Job ${job?.id} failed`, {
        type: job?.data.type,
        tenantId: job?.data.tenantId,
        error: error.message,
        attempts: job?.attemptsMade,
      });
    });

    this.ingestionQueue.on('stalled', (job: Job<IngestionJobData>) => {
      logger.warn(`Job ${job.id} stalled`, {
        type: job.data.type,
        tenantId: job.data.tenantId,
      });
    });
  }

  /**
   * Start job processors for different ingestion types
   */
  private startProcessors(): void {
    // Process jobs with configured concurrency
    this.ingestionQueue.process(
      config.jobQueue.concurrency,
      async (job: Job<IngestionJobData>) => {
        return this.processIngestionJob(job);
      }
    );

    logger.info(
      `Ingestion queue processors started with concurrency: ${config.jobQueue.concurrency}`
    );
  }

  /**
   * Process an ingestion job based on its type
   */
  private async processIngestionJob(
    job: Job<IngestionJobData>
  ): Promise<IngestionJobResult> {
    const { tenantId, type } = job.data;

    logger.info(`Processing ${type} ingestion for tenant ${tenantId}`);

    try {
      let result;

      switch (type) {
        case 'customers':
          result = await this.ingestionService.ingestCustomers(tenantId);
          break;
        case 'orders':
          result = await this.ingestionService.ingestOrders(tenantId);
          break;
        case 'products':
          result = await this.ingestionService.ingestProducts(tenantId);
          break;
        default:
          throw new Error(`Unknown ingestion type: ${type}`);
      }

      return {
        count: result.count,
        errors: result.errors,
        completedAt: new Date(),
      };
    } catch (error: any) {
      logger.error(`Ingestion job failed for tenant ${tenantId}`, {
        type,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Add a customer ingestion job to the queue
   */
  public async scheduleCustomerIngestion(
    tenantId: string,
    options?: JobOptions
  ): Promise<string> {
    const job = await this.ingestionQueue.add(
      {
        tenantId,
        type: 'customers',
      },
      options
    );

    logger.info(`Customer ingestion job scheduled`, {
      jobId: job.id,
      tenantId,
    });

    return job.id.toString();
  }

  /**
   * Add an order ingestion job to the queue
   */
  public async scheduleOrderIngestion(
    tenantId: string,
    options?: JobOptions
  ): Promise<string> {
    const job = await this.ingestionQueue.add(
      {
        tenantId,
        type: 'orders',
      },
      options
    );

    logger.info(`Order ingestion job scheduled`, {
      jobId: job.id,
      tenantId,
    });

    return job.id.toString();
  }

  /**
   * Add a product ingestion job to the queue
   */
  public async scheduleProductIngestion(
    tenantId: string,
    options?: JobOptions
  ): Promise<string> {
    const job = await this.ingestionQueue.add(
      {
        tenantId,
        type: 'products',
      },
      options
    );

    logger.info(`Product ingestion job scheduled`, {
      jobId: job.id,
      tenantId,
    });

    return job.id.toString();
  }

  /**
   * Schedule a full data sync (all resource types)
   */
  public async scheduleFullSync(tenantId: string): Promise<string[]> {
    const jobIds: string[] = [];

    // Schedule all three ingestion types
    const customerJobId = await this.scheduleCustomerIngestion(tenantId);
    const orderJobId = await this.scheduleOrderIngestion(tenantId);
    const productJobId = await this.scheduleProductIngestion(tenantId);

    jobIds.push(customerJobId, orderJobId, productJobId);

    logger.info(`Full sync scheduled for tenant ${tenantId}`, {
      jobIds,
    });

    return jobIds;
  }

  /**
   * Get job status by ID
   */
  public async getJobStatus(jobId: string): Promise<{
    id: string;
    state: string;
    progress: number;
    data: IngestionJobData;
    result?: IngestionJobResult;
    failedReason?: string;
    attemptsMade: number;
    processedOn?: number;
    finishedOn?: number;
  } | null> {
    try {
      const job = await this.ingestionQueue.getJob(jobId);

      if (!job) {
        return null;
      }

      const state = await job.getState();
      const progress = job.progress();

      return {
        id: job.id.toString(),
        state,
        progress: typeof progress === 'number' ? progress : 0,
        data: job.data,
        result: job.returnvalue,
        failedReason: job.failedReason,
        attemptsMade: job.attemptsMade,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
      };
    } catch (error: any) {
      logger.error(`Failed to get job status for ${jobId}`, {
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Get queue statistics
   */
  public async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.ingestionQueue.getWaitingCount(),
      this.ingestionQueue.getActiveCount(),
      this.ingestionQueue.getCompletedCount(),
      this.ingestionQueue.getFailedCount(),
      this.ingestionQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  }

  /**
   * Gracefully close the queue
   */
  public async close(): Promise<void> {
    await this.ingestionQueue.close();
    logger.info('Ingestion queue closed');
  }
}

// Export singleton instance
export const queueService = new QueueService();

