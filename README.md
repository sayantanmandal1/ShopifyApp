# Shopify Insights Platform

A multi-tenant SaaS platform that enables enterprise retailers to onboard their Shopify stores, automatically ingest customer and transaction data, and visualize business insights through an interactive dashboard.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Development](#development)
- [API Documentation](#api-documentation)
- [Data Models](#data-models)
- [Testing](#testing)
- [Deployment](#deployment)
- [Assumptions](#assumptions)
- [License](#license)

## Features

- **Multi-tenant Architecture**: Secure data isolation for multiple Shopify stores using tenant identifiers
- **Automated Data Ingestion**: Fetch customers, orders, and products from Shopify REST Admin API
- **Real-time Synchronization**: Webhook support for cart abandonment and checkout events
- **Analytics Dashboard**: Interactive visualizations for business metrics and trends
- **Secure Authentication**: JWT-based authentication with bcrypt password hashing and Redis session management
- **High Performance**: Redis caching layer with configurable TTLs and asynchronous job processing using Bull
- **Error Resilience**: Exponential backoff retry logic for external API calls and database connections
- **Property-Based Testing**: Comprehensive test coverage using fast-check for correctness guarantees

## Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Auth Pages   │  │  Dashboard   │  │   Charts     │      │
│  │ - Login      │  │ - Metrics    │  │ - Orders     │      │
│  │ - Register   │  │ - Filters    │  │ - Revenue    │      │
│  │ - Onboard    │  │ - Sync       │  │ - Customers  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP/REST (Port 3000)
┌────────────────────────────┴────────────────────────────────┐
│                Backend API (Express.js)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Auth Service │  │ Tenant       │  │ Ingestion    │      │
│  │ - Register   │  │ Service      │  │ Service      │      │
│  │ - Login      │  │ - Onboard    │  │ - Customers  │      │
│  │ - Logout     │  │ - Validate   │  │ - Orders     │      │
│  └──────────────┘  └──────────────┘  │ - Products   │      │
│  ┌──────────────┐  ┌──────────────┐  └──────────────┘      │
│  │ Analytics    │  │ Webhook      │  ┌──────────────┐      │
│  │ Service      │  │ Handler      │  │ Job Worker   │      │
│  │ - Metrics    │  │ - Verify     │  │ (Bull Queue) │      │
│  │ - Trends     │  │ - Process    │  └──────────────┘      │
│  └──────────────┘  └──────────────┘                         │
└────────────┬───────────────┬───────────────┬────────────────┘
             │               │               │
    ┌────────┴────────┐     │      ┌────────┴────────┐
    │   PostgreSQL    │     │      │     Redis       │
    │   (Port 5432)   │     │      │   (Port 6379)   │
    │                 │     │      │                 │
    │ - Tenants       │     │      │ - Cache Layer   │
    │ - Users         │     │      │ - Job Queue     │
    │ - Customers     │     │      │ - Sessions      │
    │ - Orders        │     │      └─────────────────┘
    │ - Products      │     │
    │ - Events        │     │
    └─────────────────┘     │
                            │
                   ┌────────┴────────┐
                   │  Shopify API    │
                   │  (External)     │
                   │                 │
                   │ - Customers     │
                   │ - Orders        │
                   │ - Products      │
                   │ - Webhooks      │
                   └─────────────────┘
```

### Component Interaction Flow

**Data Ingestion Flow:**
1. User triggers sync via Dashboard
2. Backend API enqueues ingestion job in Redis (Bull)
3. Job Worker dequeues and processes job
4. Ingestion Service fetches data from Shopify API using encrypted tenant credentials
5. Data is parsed, validated, and stored in PostgreSQL with tenant identifier
6. Related cache entries are invalidated in Redis

**Dashboard Query Flow:**
1. User requests dashboard data via Frontend
2. Backend API authenticates user via JWT and extracts tenant identifier
3. Analytics Service checks Redis cache for requested data
4. On cache miss, query PostgreSQL filtered by tenant identifier
5. Results are cached in Redis with appropriate TTL and returned to Frontend

**Webhook Flow:**
1. Shopify sends webhook (cart abandoned, checkout started) to Backend API
2. Webhook Handler verifies HMAC signature using tenant credentials
3. Event data is stored in PostgreSQL with tenant identifier
4. Related cache entries are invalidated in Redis
5. Response sent to Shopify within 3 seconds

## Project Structure

```
shopify-insights-platform/
├── backend/                      # Express.js API server
│   ├── src/
│   │   ├── clients/              # External API clients (Shopify)
│   │   ├── config/               # Configuration management
│   │   ├── db/                   # Database connections (Prisma, Redis)
│   │   ├── middleware/           # Express middleware (auth, error handling)
│   │   ├── routes/               # API route definitions
│   │   ├── services/             # Business logic services
│   │   ├── utils/                # Utility functions (encryption, logging)
│   │   └── index.ts              # Application entry point
│   ├── prisma/
│   │   ├── schema.prisma         # Database schema definition
│   │   ├── migrations/           # Database migrations
│   │   └── seed.ts               # Database seeding script
│   ├── package.json
│   ├── tsconfig.json
│   └── jest.config.js
├── frontend/                     # Next.js web application
│   ├── app/                      # Next.js app router pages
│   │   ├── dashboard/            # Dashboard page
│   │   ├── login/                # Login page
│   │   ├── register/             # Registration page
│   │   └── onboard/              # Tenant onboarding page
│   ├── components/               # React components
│   ├── contexts/                 # React contexts (Auth)
│   ├── hooks/                    # Custom React hooks
│   ├── package.json
│   └── tsconfig.json
├── .kiro/                        # Kiro specs and documentation
│   └── specs/shopify-insights-platform/
│       ├── requirements.md       # Feature requirements
│       ├── design.md             # System design
│       └── tasks.md              # Implementation tasks
├── docker-compose.yml            # Docker services configuration
├── .env.example                  # Environment variables template
└── README.md                     # This file
```

## Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Version 9 or higher (comes with Node.js)
- **Docker**: Version 20 or higher
- **Docker Compose**: Version 2 or higher
- **Shopify Store**: Access to a Shopify store with API credentials (for production use)

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd shopify-insights-platform
```

### 2. Set Up Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your configuration (see [Configuration](#configuration) section for details).

### 3. Start Infrastructure Services

Start PostgreSQL and Redis using Docker Compose:

```bash
docker-compose up -d
```

Verify services are running:

```bash
docker-compose ps
```

### 4. Set Up Backend

Install dependencies:

```bash
cd backend
npm install
```

Generate Prisma client:

```bash
npm run prisma:generate
```

Run database migrations:

```bash
npm run prisma:migrate
```

(Optional) Seed the database with sample data:

```bash
npm run prisma:seed
```

Start the backend development server:

```bash
npm run dev
```

The backend API will be available at `http://localhost:3001`.

### 5. Set Up Frontend

In a new terminal, install frontend dependencies:

```bash
cd frontend
npm install
```

Start the frontend development server:

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`.

### 6. Verify Installation

- Visit `http://localhost:3001/health` - should return `{"status":"ok"}`
- Visit `http://localhost:3000` - should display the landing page
- Register a new user account
- Onboard a Shopify store (requires valid Shopify credentials)

## Configuration

### Environment Variables

All configuration is managed through environment variables. Copy `.env.example` to `.env` and configure the following:

#### Server Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | Yes |
| `PORT` | Backend server port | `3001` | Yes |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` | Yes |

#### Database Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `POSTGRES_HOST` | PostgreSQL host | `localhost` | Yes |
| `POSTGRES_PORT` | PostgreSQL port | `5432` | Yes |
| `POSTGRES_USER` | PostgreSQL username | `postgres` | Yes |
| `POSTGRES_PASSWORD` | PostgreSQL password | `postgres` | Yes |
| `POSTGRES_DB` | Database name | `shopify_insights` | Yes |
| `DATABASE_URL` | Full database connection string | (constructed) | Yes |

#### Redis Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `REDIS_HOST` | Redis host | `localhost` | Yes |
| `REDIS_PORT` | Redis port | `6379` | Yes |
| `REDIS_PASSWORD` | Redis password (empty for no auth) | `` | No |

#### Authentication Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `JWT_SECRET` | Secret key for JWT signing | - | Yes |
| `JWT_EXPIRATION` | JWT token expiration time | `24h` | Yes |
| `BCRYPT_SALT_ROUNDS` | Bcrypt salt rounds for password hashing | `12` | Yes |
| `SESSION_TTL` | Session TTL in seconds | `86400` (24h) | Yes |

**Security Note**: Change `JWT_SECRET` to a strong random string in production.

#### Encryption Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ENCRYPTION_KEY` | 32-character key for AES-256 encryption | - | Yes |

**Security Note**: Generate a secure 32-character key for production. This is used to encrypt Shopify API credentials.

#### Cache Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `CACHE_TTL_METRICS` | Metrics cache TTL (seconds) | `300` (5 min) | No |
| `CACHE_TTL_CUSTOMERS` | Customer data cache TTL (seconds) | `900` (15 min) | No |
| `CACHE_TTL_PRODUCTS` | Product data cache TTL (seconds) | `1800` (30 min) | No |
| `CACHE_TTL_ORDERS` | Order data cache TTL (seconds) | `600` (10 min) | No |

#### API Rate Limiting

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (milliseconds) | `60000` (1 min) | No |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` | No |

#### Shopify API Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SHOPIFY_API_VERSION` | Shopify API version | `2024-01` | Yes |

#### Job Queue Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `JOB_QUEUE_CONCURRENCY` | Number of concurrent jobs | `5` | No |
| `JOB_QUEUE_MAX_RETRIES` | Max retry attempts for failed jobs | `3` | No |

#### Logging Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `LOG_LEVEL` | Logging level (error, warn, info, debug) | `info` | No |

## Development

### Running the Application

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

**Infrastructure:**
```bash
docker-compose up -d
```

### Available Scripts

#### Backend Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Start production server |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Lint TypeScript files |
| `npm run lint:fix` | Lint and auto-fix issues |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:seed` | Seed database with sample data |
| `npm run prisma:studio` | Open Prisma Studio (database GUI) |

#### Frontend Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Build production bundle |
| `npm start` | Start production server |
| `npm run lint` | Lint code |

### Database Management

**View database with Prisma Studio:**
```bash
cd backend
npm run prisma:studio
```

**Create a new migration:**
```bash
cd backend
npm run prisma:migrate
```

**Reset database (WARNING: deletes all data):**
```bash
cd backend
npx prisma migrate reset
```

### Code Quality

**Linting:**
```bash
cd backend
npm run lint:fix
```

**Formatting:**
```bash
cd backend
npm run format
```

## API Documentation

### Base URL

- Development: `http://localhost:3001/api`
- Production: `https://your-domain.com/api`

### Authentication

Most endpoints require authentication via JWT token. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### API Endpoints

#### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login user | No |
| POST | `/auth/logout` | Logout user | Yes |
| GET | `/auth/me` | Get current user | Yes |

**Register Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "tenantId": "uuid-of-tenant"
}
```

**Login Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Login Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "tenantId": "uuid"
    },
    "token": "jwt-token"
  }
}
```

#### Tenant Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/tenants` | Onboard new tenant | No |
| GET | `/tenants/me` | Get current tenant info | Yes |

**Onboard Tenant Request:**
```json
{
  "shopDomain": "mystore.myshopify.com",
  "accessToken": "shpat_xxxxx",
  "apiKey": "optional-api-key",
  "apiSecret": "optional-api-secret"
}
```

#### Ingestion Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/ingestion/sync` | Trigger full data sync | Yes |
| POST | `/ingestion/customers` | Sync customers only | Yes |
| POST | `/ingestion/orders` | Sync orders only | Yes |
| POST | `/ingestion/products` | Sync products only | Yes |
| GET | `/ingestion/status/:jobId` | Check job status | Yes |

**Sync Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "job-uuid",
    "status": "queued"
  }
}
```

#### Analytics Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/analytics/metrics` | Get aggregate metrics | Yes |
| GET | `/analytics/orders-by-date` | Get orders grouped by date | Yes |
| GET | `/analytics/top-customers` | Get top 5 customers by spend | Yes |
| GET | `/analytics/revenue-trend` | Get revenue trend over time | Yes |
| GET | `/analytics/customer-trend` | Get customer acquisition trend | Yes |
| GET | `/analytics/average-order-value-trend` | Get AOV trend | Yes |
| GET | `/analytics/orders-by-fulfillment-status` | Get orders by status | Yes |
| GET | `/analytics/top-products` | Get top products by revenue | Yes |

**Query Parameters for Date Filtering:**
- `startDate`: ISO 8601 date string (e.g., `2024-01-01`)
- `endDate`: ISO 8601 date string (e.g., `2024-12-31`)

**Metrics Response:**
```json
{
  "success": true,
  "data": {
    "totalCustomers": 150,
    "totalOrders": 450,
    "totalRevenue": 125000.50
  }
}
```

**Orders by Date Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-01",
      "count": 25,
      "revenue": 5000.00
    }
  ]
}
```

**Top Customers Response:**
```json
{
  "success": true,
  "data": [
    {
      "customerId": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "totalSpent": 15000.00,
      "ordersCount": 45
    }
  ]
}
```

#### Webhook Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/webhooks/cart-abandoned` | Handle cart abandoned event | No (HMAC verified) |
| POST | `/webhooks/checkout-started` | Handle checkout started event | No (HMAC verified) |

**Note:** Webhook endpoints verify HMAC signatures instead of JWT authentication.

### Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "details": ["Additional error details"]
}
```

**HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error
- `502` - Bad Gateway (external API error)
- `503` - Service Unavailable

## Data Models

### Database Schema

#### Tenants
Stores information about onboarded Shopify stores.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `shop_domain` | VARCHAR(255) | Shopify store domain (unique) |
| `access_token_encrypted` | TEXT | Encrypted Shopify access token |
| `api_key` | VARCHAR(255) | Optional API key |
| `api_secret_encrypted` | TEXT | Optional encrypted API secret |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

#### Users
Stores user accounts associated with tenants.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Foreign key to tenants |
| `email` | VARCHAR(255) | User email (unique) |
| `password_hash` | TEXT | Bcrypt hashed password |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

#### Customers
Stores customer data from Shopify.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Foreign key to tenants |
| `shopify_customer_id` | BIGINT | Shopify customer ID |
| `email` | VARCHAR(255) | Customer email |
| `first_name` | VARCHAR(255) | First name |
| `last_name` | VARCHAR(255) | Last name |
| `total_spent` | DECIMAL(10,2) | Total amount spent |
| `orders_count` | INTEGER | Number of orders |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

**Unique Constraint:** `(tenant_id, shopify_customer_id)`

#### Products
Stores product data from Shopify.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Foreign key to tenants |
| `shopify_product_id` | BIGINT | Shopify product ID |
| `title` | VARCHAR(500) | Product title |
| `vendor` | VARCHAR(255) | Product vendor |
| `product_type` | VARCHAR(255) | Product type |
| `price` | DECIMAL(10,2) | Product price |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

**Unique Constraint:** `(tenant_id, shopify_product_id)`

#### Orders
Stores order data from Shopify.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Foreign key to tenants |
| `shopify_order_id` | BIGINT | Shopify order ID |
| `customer_id` | UUID | Foreign key to customers (nullable) |
| `order_number` | VARCHAR(255) | Order number |
| `total_price` | DECIMAL(10,2) | Total order price |
| `subtotal_price` | DECIMAL(10,2) | Subtotal price |
| `total_tax` | DECIMAL(10,2) | Total tax |
| `currency` | VARCHAR(10) | Currency code |
| `financial_status` | VARCHAR(50) | Financial status |
| `fulfillment_status` | VARCHAR(50) | Fulfillment status |
| `order_date` | TIMESTAMP | Order date |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

**Unique Constraint:** `(tenant_id, shopify_order_id)`
**Indexes:** `tenant_id`, `(tenant_id, order_date)`

#### Order Line Items
Stores line items for orders.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `order_id` | UUID | Foreign key to orders |
| `product_id` | UUID | Foreign key to products (nullable) |
| `shopify_product_id` | BIGINT | Shopify product ID |
| `shopify_variant_id` | BIGINT | Shopify variant ID |
| `title` | VARCHAR(500) | Line item title |
| `quantity` | INTEGER | Quantity |
| `price` | DECIMAL(10,2) | Price per item |
| `created_at` | TIMESTAMP | Creation timestamp |

#### Events
Stores webhook events from Shopify.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Foreign key to tenants |
| `event_type` | VARCHAR(100) | Event type (cart_abandoned, checkout_started) |
| `shopify_id` | BIGINT | Shopify entity ID |
| `customer_id` | UUID | Foreign key to customers (nullable) |
| `payload` | JSONB | Full event payload |
| `created_at` | TIMESTAMP | Creation timestamp |

**Indexes:** `tenant_id`, `(tenant_id, event_type)`

### Data Isolation

All entities (except tenants and users) include a `tenant_id` column. All queries MUST filter by `tenant_id` to ensure data isolation between tenants. This is enforced at the service layer.

## Testing

### Test Framework

- **Backend**: Jest with ts-jest for TypeScript support
- **Property-Based Testing**: fast-check for correctness properties
- **Integration Testing**: Supertest for API endpoint testing

### Running Tests

**Run all tests:**
```bash
cd backend
npm test
```

**Run tests in watch mode:**
```bash
npm run test:watch
```

**Run tests with coverage:**
```bash
npm run test:coverage
```

### Test Structure

Tests are co-located with source files in `__tests__` directories:

```
backend/src/
├── services/
│   ├── auth.service.ts
│   └── __tests__/
│       └── auth.service.test.ts
```

### Test Coverage

The project includes:

1. **Unit Tests**: Test individual functions and services in isolation
2. **Property-Based Tests**: Verify correctness properties across many generated inputs (100+ iterations per property)
3. **Integration Tests**: Test API endpoints with real database connections

**Property-Based Tests** validate critical correctness properties including:
- Tenant isolation and data filtering
- Idempotency of ingestion operations
- Encryption round-trip correctness
- Aggregation accuracy
- Authentication and session management
- Error handling and retry logic
- API response consistency
- Cache behavior

Each property-based test is tagged with a comment referencing the design document:
```typescript
// Feature: shopify-insights-platform, Property 6: Idempotent ingestion
```

### Test Best Practices

- Tests should be independent and not rely on execution order
- Use factories to generate test data with realistic values
- Clean up test data after each test suite
- Mock external API calls (Shopify API) in unit tests
- Use real database connections for integration tests

## Deployment

### Production Considerations

**Environment:**
- Use managed PostgreSQL (AWS RDS, GCP Cloud SQL, etc.)
- Use managed Redis (AWS ElastiCache, GCP Memorystore, etc.)
- Deploy backend as containerized application (Docker)
- Deploy frontend to Vercel, Netlify, or similar platform

**Security:**
- Generate strong random values for `JWT_SECRET` and `ENCRYPTION_KEY`
- Use HTTPS for all communication
- Enable database SSL connections
- Implement rate limiting at the load balancer level
- Regularly rotate credentials
- Enable database backups
- Monitor for suspicious activity

**Scaling:**
- Use connection pooling for database (configured in Prisma)
- Scale backend horizontally with multiple instances
- Use Redis cluster for high availability
- Implement CDN for frontend assets
- Monitor performance metrics (response times, error rates)

**Environment Variables:**
- Never commit `.env` files to version control
- Use secret management services (AWS Secrets Manager, etc.)
- Set `NODE_ENV=production` in production

### Docker Deployment

**Build backend image:**
```bash
cd backend
docker build -t shopify-insights-backend .
```

**Build frontend image:**
```bash
cd frontend
docker build -t shopify-insights-frontend .
```

**Run with Docker Compose:**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Assumptions

The following assumptions were made during development:

### Business Assumptions

1. **Single User per Tenant**: Each tenant (Shopify store) has one primary user account. Multi-user support per tenant is not implemented.

2. **Shopify API Access**: Tenants have valid Shopify API credentials (access token) with appropriate permissions to read customers, orders, and products.

3. **Data Freshness**: Cached data with TTLs (5-30 minutes) is acceptable for dashboard metrics. Real-time accuracy is not required for all queries.

4. **Webhook Registration**: Shopify webhooks are manually registered by the tenant. Automatic webhook registration is not implemented.

5. **Currency**: All monetary values are stored as provided by Shopify. Multi-currency conversion is not implemented.

### Technical Assumptions

1. **Data Volume**: The system is designed for small to medium-sized Shopify stores (up to 100K orders). Large-scale stores may require additional optimization.

2. **Shopify API Rate Limits**: The system respects Shopify's rate limits using exponential backoff. Batch size is set to 250 records per request.

3. **Pagination**: API responses are limited to 100 records per page. Frontend implements pagination for large datasets.

4. **Time Zones**: All timestamps are stored in UTC. Time zone conversion is handled at the presentation layer.

5. **Data Retention**: Historical data is retained indefinitely. Data archival and cleanup policies are not implemented.

6. **Error Recovery**: Failed ingestion jobs are retried up to 3 times with exponential backoff. Manual intervention may be required for persistent failures.

7. **Session Management**: Sessions are stored in Redis with 24-hour expiration. Session refresh is not implemented.

8. **Database Migrations**: Database schema changes are managed through Prisma migrations. Rollback procedures should be tested before production deployment.

9. **Monitoring**: Application logging is implemented using a custom logger. External monitoring and alerting (e.g., Datadog, New Relic) should be configured separately.

10. **Backup and Recovery**: Database backups are the responsibility of the infrastructure team. The application does not implement backup logic.

### Security Assumptions

1. **HTTPS**: Production deployment uses HTTPS for all communication. HTTP is only used in development.

2. **Credential Storage**: Shopify API credentials are encrypted using AES-256 before storage. The encryption key is stored in environment variables.

3. **Password Security**: User passwords are hashed using bcrypt with 12 salt rounds. Plain text passwords are never stored.

4. **JWT Security**: JWT tokens are signed using HS256 algorithm. Token expiration is set to 24 hours.

5. **CORS**: CORS is configured to allow requests only from the configured frontend URL.

6. **SQL Injection**: Prisma ORM uses parameterized queries, preventing SQL injection attacks.

7. **Webhook Verification**: All webhook requests are verified using HMAC signatures before processing.

### Data Model Assumptions

1. **Unique Identifiers**: Shopify IDs combined with tenant IDs uniquely identify entities. Duplicate Shopify IDs across tenants are allowed.

2. **Soft Deletes**: Entities are not soft-deleted. Cascade deletes are configured at the database level.

3. **Relationships**: Order line items maintain relationships to products. If a product is deleted, the product_id is set to NULL but the line item is preserved.

4. **Customer Association**: Orders may not have an associated customer (guest checkouts). The customer_id field is nullable.

5. **Product Variants**: Product variants are stored as separate records with a parent product relationship. Variant-specific pricing is supported.

6. **Event Payload**: Webhook event payloads are stored as JSONB for flexibility. Schema validation is not enforced at the database level.

## Technology Stack

### Backend Technologies

- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.3+
- **Framework**: Express.js 4.18
- **ORM**: Prisma 7.1
- **Database**: PostgreSQL 15
- **Cache**: Redis 7 with ioredis client
- **Job Queue**: Bull 4.12 (Redis-backed)
- **Authentication**: JWT (jsonwebtoken) + bcrypt
- **HTTP Client**: Axios
- **Testing**: Jest 29 + fast-check 3.15
- **Code Quality**: ESLint + Prettier

### Frontend Technologies

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4
- **Data Fetching**: SWR 2.3
- **Charts**: Recharts 3.5
- **Code Quality**: ESLint

### Infrastructure

- **Containerization**: Docker + Docker Compose
- **Database**: PostgreSQL 15 Alpine
- **Cache**: Redis 7 Alpine

## Troubleshooting

### Common Issues

**Backend won't start:**
- Verify PostgreSQL and Redis are running: `docker-compose ps`
- Check environment variables in `.env`
- Ensure database migrations are applied: `npm run prisma:migrate`

**Database connection errors:**
- Verify `DATABASE_URL` in `.env` matches your PostgreSQL configuration
- Check PostgreSQL is accessible: `docker-compose logs postgres`
- Ensure PostgreSQL port (5432) is not in use by another service

**Redis connection errors:**
- Verify Redis is running: `docker-compose ps`
- Check Redis logs: `docker-compose logs redis`
- Ensure Redis port (6379) is not in use

**Shopify API errors:**
- Verify Shopify credentials are correct
- Check Shopify API rate limits
- Ensure Shopify API version is supported

**Authentication errors:**
- Verify `JWT_SECRET` is set in `.env`
- Check token expiration settings
- Clear browser cookies and localStorage

**Frontend can't connect to backend:**
- Verify backend is running on port 3001
- Check `FRONTEND_URL` in backend `.env` matches frontend URL
- Verify CORS configuration

### Logs

**View backend logs:**
```bash
# Development
cd backend
npm run dev
# Logs will appear in console
```

**View Docker logs:**
```bash
docker-compose logs -f postgres
docker-compose logs -f redis
```

**View Prisma query logs:**
Set `LOG_LEVEL=debug` in `.env` to see database queries.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `npm test`
5. Run linter: `npm run lint:fix`
6. Commit your changes: `git commit -m 'Add my feature'`
7. Push to the branch: `git push origin feature/my-feature`
8. Submit a pull request

## Documentation

Detailed specifications and design documents are available in `.kiro/specs/shopify-insights-platform/`:

- **requirements.md**: Complete feature requirements with acceptance criteria following EARS (Easy Approach to Requirements Syntax) patterns
- **design.md**: System architecture, component interfaces, data models, correctness properties, and testing strategy
- **tasks.md**: Implementation task list with progress tracking

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation in `.kiro/specs/`
- Review troubleshooting section above

---

**Built with ❤️ using Kiro AI**
