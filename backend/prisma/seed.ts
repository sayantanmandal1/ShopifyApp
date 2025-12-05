import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import dotenv from 'dotenv';

// Load environment variables from root .env file
dotenv.config({ path: '../.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Simple encryption function for demo purposes
function encrypt(text: string): string {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(process.env.ENCRYPTION_KEY || 'dev-encryption-key-32-chars-long', 'utf-8').slice(0, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

async function main() {
  console.log('Starting seed...');

  // Create a test tenant
  const tenant = await prisma.tenant.create({
    data: {
      shopDomain: 'test-shop.myshopify.com',
      accessTokenEncrypted: encrypt('test-access-token-12345'),
      apiKey: 'test-api-key',
      apiSecretEncrypted: encrypt('test-api-secret'),
    },
  });
  console.log('Created tenant:', tenant.shopDomain);

  // Create a test user
  const passwordHash = await bcrypt.hash('password123', 12);
  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'admin@test-shop.com',
      passwordHash,
    },
  });
  console.log('Created user:', user.email);

  // Create test customers
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        tenantId: tenant.id,
        shopifyCustomerId: BigInt(1001),
        email: 'customer1@example.com',
        firstName: 'John',
        lastName: 'Doe',
        totalSpent: 1250.50,
        ordersCount: 5,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
      },
    }),
    prisma.customer.create({
      data: {
        tenantId: tenant.id,
        shopifyCustomerId: BigInt(1002),
        email: 'customer2@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        totalSpent: 2340.75,
        ordersCount: 8,
        createdAt: new Date('2024-02-10'),
        updatedAt: new Date('2024-02-10'),
      },
    }),
    prisma.customer.create({
      data: {
        tenantId: tenant.id,
        shopifyCustomerId: BigInt(1003),
        email: 'customer3@example.com',
        firstName: 'Bob',
        lastName: 'Johnson',
        totalSpent: 890.25,
        ordersCount: 3,
        createdAt: new Date('2024-03-05'),
        updatedAt: new Date('2024-03-05'),
      },
    }),
  ]);
  console.log(`Created ${customers.length} customers`);

  // Create test products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        tenantId: tenant.id,
        shopifyProductId: BigInt(2001),
        title: 'Premium T-Shirt',
        vendor: 'Fashion Co',
        productType: 'Apparel',
        price: 29.99,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    }),
    prisma.product.create({
      data: {
        tenantId: tenant.id,
        shopifyProductId: BigInt(2002),
        title: 'Designer Jeans',
        vendor: 'Fashion Co',
        productType: 'Apparel',
        price: 89.99,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    }),
    prisma.product.create({
      data: {
        tenantId: tenant.id,
        shopifyProductId: BigInt(2003),
        title: 'Leather Wallet',
        vendor: 'Accessories Inc',
        productType: 'Accessories',
        price: 45.00,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    }),
  ]);
  console.log(`Created ${products.length} products`);

  // Create test orders
  const orders = await Promise.all([
    prisma.order.create({
      data: {
        tenantId: tenant.id,
        shopifyOrderId: BigInt(3001),
        customerId: customers[0].id,
        orderNumber: 'ORD-1001',
        totalPrice: 119.98,
        subtotalPrice: 119.98,
        totalTax: 0,
        currency: 'USD',
        financialStatus: 'paid',
        fulfillmentStatus: 'fulfilled',
        orderDate: new Date('2024-01-20'),
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-01-20'),
        lineItems: {
          create: [
            {
              productId: products[0].id,
              shopifyProductId: products[0].shopifyProductId,
              title: products[0].title,
              quantity: 2,
              price: 29.99,
              createdAt: new Date('2024-01-20'),
            },
            {
              productId: products[1].id,
              shopifyProductId: products[1].shopifyProductId,
              title: products[1].title,
              quantity: 1,
              price: 89.99,
              createdAt: new Date('2024-01-20'),
            },
          ],
        },
      },
    }),
    prisma.order.create({
      data: {
        tenantId: tenant.id,
        shopifyOrderId: BigInt(3002),
        customerId: customers[1].id,
        orderNumber: 'ORD-1002',
        totalPrice: 225.00,
        subtotalPrice: 225.00,
        totalTax: 0,
        currency: 'USD',
        financialStatus: 'paid',
        fulfillmentStatus: 'fulfilled',
        orderDate: new Date('2024-02-15'),
        createdAt: new Date('2024-02-15'),
        updatedAt: new Date('2024-02-15'),
        lineItems: {
          create: [
            {
              productId: products[2].id,
              shopifyProductId: products[2].shopifyProductId,
              title: products[2].title,
              quantity: 5,
              price: 45.00,
              createdAt: new Date('2024-02-15'),
            },
          ],
        },
      },
    }),
    prisma.order.create({
      data: {
        tenantId: tenant.id,
        shopifyOrderId: BigInt(3003),
        customerId: customers[2].id,
        orderNumber: 'ORD-1003',
        totalPrice: 89.99,
        subtotalPrice: 89.99,
        totalTax: 0,
        currency: 'USD',
        financialStatus: 'paid',
        fulfillmentStatus: 'pending',
        orderDate: new Date('2024-03-10'),
        createdAt: new Date('2024-03-10'),
        updatedAt: new Date('2024-03-10'),
        lineItems: {
          create: [
            {
              productId: products[1].id,
              shopifyProductId: products[1].shopifyProductId,
              title: products[1].title,
              quantity: 1,
              price: 89.99,
              createdAt: new Date('2024-03-10'),
            },
          ],
        },
      },
    }),
  ]);
  console.log(`Created ${orders.length} orders with line items`);

  // Create test events
  const events = await Promise.all([
    prisma.event.create({
      data: {
        tenantId: tenant.id,
        eventType: 'cart_abandoned',
        shopifyId: BigInt(4001),
        customerId: customers[0].id,
        payload: {
          cart_token: 'abc123',
          abandoned_checkout_url: 'https://test-shop.myshopify.com/checkout/abc123',
          line_items: [{ product_id: 2001, quantity: 1 }],
        },
      },
    }),
    prisma.event.create({
      data: {
        tenantId: tenant.id,
        eventType: 'checkout_started',
        shopifyId: BigInt(4002),
        customerId: customers[1].id,
        payload: {
          checkout_token: 'def456',
          total_price: '45.00',
          line_items: [{ product_id: 2003, quantity: 1 }],
        },
      },
    }),
  ]);
  console.log(`Created ${events.length} events`);

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
