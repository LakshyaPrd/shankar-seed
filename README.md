# Shankar Seeds ERP - Enterprise Commercial Application

Production-ready ERP web application designed specifically for **Shankar Seeds ERP**, a commercial seed trading & distribution business in India.

The application is structured into two independent projects:
- **`backend/`**: Node.js, Express.js, TypeScript, Prisma ORM, MongoDB, JWT Auth, RBAC, Multer, Swagger API docs.
- **`frontend/`**: Next.js 15 (App Router), TypeScript, TailwindCSS, shadcn/ui inspired UI, TanStack Table v8, TanStack Query, Recharts, Framer Motion.

---

## Key Business Features

1. **Digital Dispatch Register (Replaces Handwritten Gate Register)**:
   - Digital log for Bill Number, Party Name, Transport Company, Driver Name, Mobile, Vehicle Number, Destination, and Items.
   - **Automatic Inventory Deduction**: Saving a dispatch entry automatically reduces warehouse inventory stock and records a stock movement `OUT`.
2. **Purchase Entry & Receiving**:
   - Supplier invoice entries including GST percentages, transport charges, and line items.
   - **Automatic Inventory Addition**: Saving a purchase entry automatically increments warehouse inventory stock and records a stock movement `IN`.
3. **Inventory & Warehouse Batch Tracking**:
   - Track batches, expiry dates, current stock, incoming vs. outgoing stock, and low stock thresholds.
   - Low stock trigger warnings with manual stock adjustment audit trail.
4. **Party Ledgers & Customer Directory**:
   - Track customer party outstanding balances, GSTIN, contact details, and full order history.
5. **Staff Roster & Attendance Sheet**:
   - Daily attendance marking (Present, Absent, Half Day, Leave, Overtime) and automated monthly salary payout calculation.
6. **Expense Tracking**:
   - Operational expense logging categorized into Fuel, Loading, Unloading, Tea, Office, Electricity, and Misc.
7. **Reports & Exports**:
   - Export Sales, Purchases, Expenses, and Inventory reports to **CSV**, **Excel**, or **PDF**.
8. **Enterprise Search & Command Palette**:
   - Global keyboard shortcut (`Ctrl + K` or `Cmd + K`) for instant navigation across all ERP modules.

---

## Tech Stack Overview

### Backend (`backend/`)
- **Framework**: NestJS 10 (TypeScript)
- **Database**: PostgreSQL
- **ORM**: Prisma ORM
- **Authentication**: JWT Access & Refresh Token strategy, RBAC Guards (`OWNER`, `MANAGER`, `ACCOUNTANT`, `WAREHOUSE_STAFF`, `WORKER`)
- **API Docs**: Swagger / OpenAPI UI at `/api/docs`
- **Validation**: Class Validator & Class Transformer

### Frontend (`frontend/`)
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS & Modern Enterprise Dark Mode Support
- **Data Table**: TanStack Table v8 with sticky header, multi-column search, column visibility toggle, pagination, sorting, CSV export
- **Data Fetching**: TanStack Query (React Query)
- **State Management**: Zustand
- **Icons**: Lucide Icons
- **Charts**: Recharts

---

## System Requirements
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9+ or yarn / pnpm
- **PostgreSQL**: v14+ (or Docker equivalent)

---

## Quick Start (Local Setup)

### 1. Database & Backend Setup

```bash
# Option A: Start MongoDB container using Docker Compose
docker-compose -f docker-compose.dev.yml up -d

# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Generate Prisma client for MongoDB
npm run prisma:generate

# Push schema to MongoDB and seed database
npx prisma db push
npm run prisma:seed

# Start Express Node.js backend server
npm run dev
```
- Backend API will run on `http://localhost:5000/api`
- Swagger documentation will be available at `http://localhost:5000/api/docs`

#### Default Admin Credentials (Seeded):
- **Email**: `admin@shankarseeds.com`
- **Password**: `admin123`

---

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start Next.js development server
npm run dev
```
- Frontend web application will run on `http://localhost:3000`

---

## Docker Deployment (Dev & Production)

### Local Docker Compose

To launch PostgreSQL, Backend API, and Next.js Frontend together in Docker:

```bash
# Build and run containers
docker-compose up --build -d
```

Containers started:
- `shankar_seeds_postgres`: PostgreSQL container on port `5432`
- `shankar_seeds_backend`: NestJS backend API on port `5000`
- `shankar_seeds_frontend`: Next.js web application on port `3000`

---

## Cloud Deployment Guides

### Option A: Deployment on Render

1. **PostgreSQL Database**:
   - Create a **New PostgreSQL** instance on Render.
   - Note down the `Internal Database URL` or `External Database URL`.

2. **Backend Web Service**:
   - Create a **New Web Service** pointing to your Git repository (Root Directory: `backend`).
   - Environment: `Docker` (or Node runtime with `npm run build` and `npm run start:prod`).
   - Add Environment Variables:
     - `DATABASE_URL`: Your Render PostgreSQL database URL
     - `PORT`: `5000`
     - `JWT_SECRET`: `your_random_secure_jwt_secret`
     - `JWT_REFRESH_SECRET`: `your_random_secure_refresh_secret`
     - `CORS_ORIGIN`: `https://your-frontend-render-app.onrender.com`
   - Run initial database migration:
     - In Render shell or pre-deploy command: `npx prisma db push && npm run prisma:seed`

3. **Frontend Web Service**:
   - Create a **New Web Service** pointing to your Git repository (Root Directory: `frontend`).
   - Environment: `Docker` (or Next.js runtime).
   - Add Environment Variable:
     - `NEXT_PUBLIC_API_URL`: `https://your-backend-render-app.onrender.com/api`

---

### Option B: Migration to Hostinger VPS (Docker)

When migrating to a Hostinger VPS with Docker installed:

1. **Clone repository onto VPS**:
   ```bash
   git clone <your-repo-url> /opt/shankar-seeds-erp
   cd /opt/shankar-seeds-erp
   ```

2. **Configure Environment File**:
   Create `.env` file in the root directory:
   ```env
   POSTGRES_PASSWORD=your_strong_vps_db_password
   JWT_SECRET=your_production_vps_jwt_secret
   ```

3. **Launch with Docker Compose**:
   ```bash
   docker-compose up --build -d
   ```

4. **Execute Database Seed on Hostinger VPS**:
   ```bash
   docker exec -it shankar_seeds_backend npx prisma db push
   docker exec -it shankar_seeds_backend npm run prisma:seed
   ```

5. **Nginx Reverse Proxy & SSL Setup (Optional)**:
   Configure Nginx on VPS to proxy `domain.com` -> `http://localhost:3000` and `api.domain.com` -> `http://localhost:5000`, then enable Certbot SSL (`sudo certbot --nginx`).

---

## Environment Variables Reference

### Backend (`backend/.env`)
| Variable | Description | Example Value |
|---|---|---|
| `PORT` | API Server Port | `5000` |
| `DATABASE_URL` | PostgreSQL Connection String | `postgresql://postgres:postgres@localhost:5432/shankar_seeds_erp` |
| `JWT_SECRET` | Secret key for JWT access tokens | `shankar_seeds_erp_super_secret_jwt_key_2026` |
| `JWT_EXPIRES_IN` | Token expiration period | `7d` |
| `JWT_REFRESH_SECRET` | Secret key for refresh tokens | `shankar_seeds_erp_refresh_secret_key_2026` |
| `CORS_ORIGIN` | Allowed CORS origins | `http://localhost:3000` |

### Frontend (`frontend/.env`)
| Variable | Description | Example Value |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL for REST API endpoints | `http://localhost:5000/api` |

---

## Codebase Structure

```
shankar-seeds-erp/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema (20 relational models)
│   │   └── seed.ts              # Initial seed script
│   ├── src/
│   │   ├── common/              # Guards, Filters, Interceptors, Decorators
│   │   ├── modules/             # Auth, Users, Products, Inventory, Purchase, Dispatch, etc.
│   │   ├── prisma/              # PrismaService & PrismaModule
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js App Router (Dashboard, Products, Dispatch, etc.)
│   │   ├── components/          # Topbar, Sidebar, DataTable, Modals, Providers
│   │   ├── lib/                 # Axios API instance and utility functions
│   │   ├── store/               # Zustand Auth Store
│   │   └── types/               # TypeScript interface definitions
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml           # Production Docker setup
├── docker-compose.dev.yml       # Development Docker setup
└── README.md                    # System documentation
```

---

## License
Commercial Proprietary License - Created for **Shankar Seeds ERP**.
