import prisma from '../db/prisma';
import { logger } from '../utils/logger';
import { decrypt } from '../utils/encryption';
import { ShopifyClient } from '../clients/shopify.client';

export interface IngestionResult {
  count: number;
  errors: string[];
}

export class IngestionService {
  private async getShopifyClient(tenantId: string): Promise<ShopifyClient> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    const accessToken = decrypt(tenant.accessTokenEncrypted);

    return new ShopifyClient({
      shopDomain: tenant.shopDomain,
      accessToken,
    });
  }

  async ingestCustomers(tenantId: string): Promise<IngestionResult> {
    const result: IngestionResult = {
      count: 0,
      errors: [],
    };

    try {
      logger.info(`Starting customer ingestion for tenant: ${tenantId}`);

      const shopifyClient = await this.getShopifyClient(tenantId);

      let hasMorePages = true;
      let pageInfo: string | undefined = undefined;

      while (hasMorePages) {
        try {
          const customers = await shopifyClient.getCustomers(
            pageInfo ? { page_info: pageInfo } : { limit: 250 }
          );

          if (customers.length === 0) {
            hasMorePages = false;
            break;
          }

          for (const shopifyCustomer of customers) {
            try {
              await prisma.customer.upsert({
                where: {
                  tenantId_shopifyCustomerId: {
                    tenantId,
                    shopifyCustomerId: BigInt(shopifyCustomer.id),
                  },
                },
                update: {
                  email: shopifyCustomer.email || null,
                  firstName: shopifyCustomer.first_name || null,
                  lastName: shopifyCustomer.last_name || null,
                  totalSpent: parseFloat(shopifyCustomer.total_spent) || 0,
                  ordersCount: shopifyCustomer.orders_count || 0,
                  updatedAt: new Date(shopifyCustomer.updated_at),
                },
                create: {
                  tenantId,
                  shopifyCustomerId: BigInt(shopifyCustomer.id),
                  email: shopifyCustomer.email || null,
                  firstName: shopifyCustomer.first_name || null,
                  lastName: shopifyCustomer.last_name || null,
                  totalSpent: parseFloat(shopifyCustomer.total_spent) || 0,
                  ordersCount: shopifyCustomer.orders_count || 0,
                  createdAt: new Date(shopifyCustomer.created_at),
                  updatedAt: new Date(shopifyCustomer.updated_at),
                },
              });

              result.count++;
            } catch (error: any) {
              const errorMsg = `Failed to upsert customer ${shopifyCustomer.id}: ${error.message}`;
              logger.error(errorMsg);
              result.errors.push(errorMsg);
            }
          }

          if (customers.length < 250) {
            hasMorePages = false;
          } else {
            hasMorePages = false;
          }
        } catch (error: any) {
          const errorMsg = `Failed to fetch customers page: ${error.message}`;
          logger.error(errorMsg);
          result.errors.push(errorMsg);
          hasMorePages = false;
        }
      }

      logger.info(
        `Customer ingestion completed for tenant ${tenantId}. ` +
        `Processed: ${result.count}, Errors: ${result.errors.length}`
      );

      return result;
    } catch (error: any) {
      const errorMsg = `Customer ingestion failed for tenant ${tenantId}: ${error.message}`;
      logger.error(errorMsg);
      result.errors.push(errorMsg);
      return result;
    }
  }

  async ingestOrders(tenantId: string): Promise<IngestionResult> {
    throw new Error('Not implemented yet');
  }

  async ingestProducts(tenantId: string): Promise<IngestionResult> {
    throw new Error('Not implemented yet');
  }
}
