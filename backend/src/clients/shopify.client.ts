import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface ShopifyCredentials {
  shopDomain: string;
  accessToken: string;
}

export interface ShopifyShop {
  id: number;
  name: string;
  email: string;
  domain: string;
  created_at: string;
}

export interface PaginationParams {
  limit?: number;
  page_info?: string;
}

export interface ShopifyCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  total_spent: string;
  orders_count: number;
  created_at: string;
  updated_at: string;
}

export interface ShopifyOrder {
  id: number;
  order_number: string;
  customer?: {
    id: number;
  };
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  created_at: string;
  updated_at: string;
  line_items: ShopifyLineItem[];
}

export interface ShopifyLineItem {
  id: number;
  product_id: number | null;
  variant_id: number | null;
  title: string;
  quantity: number;
  price: string;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  vendor: string;
  product_type: string;
  created_at: string;
  updated_at: string;
  variants: ShopifyVariant[];
}

export interface ShopifyVariant {
  id: number;
  product_id: number;
  title: string;
  price: string;
  sku: string;
}

export class ShopifyClient {
  private axiosInstance: ReturnType<typeof axios.create>;
  private readonly maxRetries: number = 3;
  private readonly baseDelay: number = 1000; // 1 second
  private readonly maxDelay: number = 60000; // 60 seconds
  private lastRequestTime: number = 0;
  private readonly minRequestInterval: number = 500; // 500ms between requests for rate limiting

  constructor(credentials: ShopifyCredentials) {
    const { shopDomain, accessToken } = credentials;
    
    // Ensure shop domain doesn't include protocol or path
    const cleanDomain = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    this.axiosInstance = axios.create({
      baseURL: `https://${cleanDomain}/admin/api/${config.shopify.apiVersion}`,
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Implements rate limiting by ensuring minimum time between requests
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const delay = this.minRequestInterval - timeSinceLastRequest;
      await this.sleep(delay);
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateBackoffDelay(attempt: number): number {
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 1000; // 0-1000ms jitter
    const delay = Math.min(exponentialDelay + jitter, this.maxDelay);
    return delay;
  }

  /**
   * Retry logic with exponential backoff
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        await this.rateLimit();
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        const isRetryable = this.isRetryableError(error);
        
        if (!isRetryable || attempt === this.maxRetries - 1) {
          throw error;
        }

        const delay = this.calculateBackoffDelay(attempt);
        logger.warn(
          `${operationName} failed (attempt ${attempt + 1}/${this.maxRetries}). ` +
          `Retrying in ${delay}ms. Error: ${error.message}`
        );
        
        await this.sleep(delay);
      }
    }

    throw lastError || new Error(`${operationName} failed after ${this.maxRetries} attempts`);
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      return true;
    }

    // Axios errors - check if error has response property
    if (error.response) {
      const status = error.response.status;
      
      // Retry on rate limiting (429) and server errors (5xx)
      if (status === 429 || (status && status >= 500 && status < 600)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Validates Shopify credentials by fetching shop information
   * @returns Shop information if credentials are valid
   * @throws Error if credentials are invalid
   */
  async validateCredentials(): Promise<ShopifyShop> {
    return this.retryWithBackoff(async () => {
      try {
        const response = await this.axiosInstance.get<{ shop: ShopifyShop }>('/shop.json');
        
        if (response.data && response.data.shop) {
          logger.info(`Successfully validated Shopify credentials for shop: ${response.data.shop.domain}`);
          return response.data.shop;
        }
        
        throw new Error('Invalid response from Shopify API');
      } catch (error: any) {
        if (error.response) {
          const status = error.response.status;
          const message = error.response.data?.errors || error.response.statusText;
          
          if (status === 401 || status === 403) {
            logger.error(`Shopify authentication failed: ${message}`);
            throw new Error('Invalid Shopify credentials');
          }
          
          logger.error(`Shopify API error (${status}): ${message}`);
          throw new Error(`Shopify API error: ${message}`);
        }
        
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          logger.error(`Cannot connect to Shopify shop: ${error.message}`);
          throw new Error('Invalid shop domain or shop does not exist');
        }
        
        logger.error(`Shopify validation error: ${error.message}`);
        throw new Error('Failed to validate Shopify credentials');
      }
    }, 'validateCredentials');
  }

  /**
   * Fetches customers from Shopify API with pagination (250 per batch)
   * @param params Pagination parameters
   * @returns Array of Shopify customers
   */
  async getCustomers(params?: PaginationParams): Promise<ShopifyCustomer[]> {
    return this.retryWithBackoff(async () => {
      const queryParams = {
        limit: params?.limit || 250,
        ...(params?.page_info && { page_info: params.page_info }),
      };

      const response = await this.axiosInstance.get<{ customers: ShopifyCustomer[] }>(
        '/customers.json',
        { params: queryParams }
      );

      if (!response.data || !Array.isArray(response.data.customers)) {
        throw new Error('Invalid response format from Shopify customers API');
      }

      logger.info(`Fetched ${response.data.customers.length} customers from Shopify`);
      return response.data.customers;
    }, 'getCustomers');
  }

  /**
   * Fetches orders from Shopify API with pagination
   * @param params Pagination parameters
   * @returns Array of Shopify orders with line items
   */
  async getOrders(params?: PaginationParams): Promise<ShopifyOrder[]> {
    return this.retryWithBackoff(async () => {
      const queryParams = {
        limit: params?.limit || 250,
        status: 'any', // Fetch all orders regardless of status
        ...(params?.page_info && { page_info: params.page_info }),
      };

      const response = await this.axiosInstance.get<{ orders: ShopifyOrder[] }>(
        '/orders.json',
        { params: queryParams }
      );

      if (!response.data || !Array.isArray(response.data.orders)) {
        throw new Error('Invalid response format from Shopify orders API');
      }

      logger.info(`Fetched ${response.data.orders.length} orders from Shopify`);
      return response.data.orders;
    }, 'getOrders');
  }

  /**
   * Fetches products from Shopify API with pagination
   * @param params Pagination parameters
   * @returns Array of Shopify products with variants
   */
  async getProducts(params?: PaginationParams): Promise<ShopifyProduct[]> {
    return this.retryWithBackoff(async () => {
      const queryParams = {
        limit: params?.limit || 250,
        ...(params?.page_info && { page_info: params.page_info }),
      };

      const response = await this.axiosInstance.get<{ products: ShopifyProduct[] }>(
        '/products.json',
        { params: queryParams }
      );

      if (!response.data || !Array.isArray(response.data.products)) {
        throw new Error('Invalid response format from Shopify products API');
      }

      logger.info(`Fetched ${response.data.products.length} products from Shopify`);
      return response.data.products;
    }, 'getProducts');
  }
}
