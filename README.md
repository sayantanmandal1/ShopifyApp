# Shopify Insights Platform

A multi-tenant SaaS platform that enables enterprise retailers to onboard their Shopify stores, automatically ingest customer and transaction data, and visualize business insights through an interactive dashboard.

## Features

- **Multi-tenant Architecture**: Secure data isolation for multiple Shopify stores
- **Automated Data Ingestion**: Fetch customers, orders, and products from Shopify API
- **Real-time Synchronization**: Webhook support for live data updates
- **Analytics Dashboard**: Interactive visualizations for business metrics
- **Secure Authentication**: JWT-based authentication with session management
- **High Performance**: Redis caching and asynchronous job processing

## Project Structure

```
shopify-insights-platform/
├── backend/              # Express.js API server
├── frontend/             # Next.js web application
├── .kiro/                # Kiro specs and documentation
├── docker-compose.yml    # Docker services configuration
└── .env                  # Environment variables (gitignored)
```

## Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- npm or yarn

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd shopify-insights-platform
```

2. **Set up environment variables**

```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start infrastructure services**

```bash
docker-compose up -d
```

4. **Install and start backend**

```bash
cd backend
npm install
npm run dev
```

5. **Install and start frontend**

```bash
cd frontend
npm install
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Technology Stack

### Backend
- Node.js + TypeScript
- Express.js
- PostgreSQL (Prisma ORM)
- Redis (caching + job queue)
- Bull (job processing)
- JWT authentication

### Frontend
- Next.js 14
- React
- TypeScript
- Tailwind CSS
- Recharts (data visualization)

### Infrastructure
- Docker & Docker Compose
- PostgreSQL 15
- Redis 7

## Development

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Code Quality

```bash
# Lint
npm run lint

# Format
npm run format
```

## Documentation

Detailed specifications and design documents are available in `.kiro/specs/shopify-insights-platform/`:
- `requirements.md` - Feature requirements and acceptance criteria
- `design.md` - System architecture and design decisions
- `tasks.md` - Implementation task list

## License

MIT
