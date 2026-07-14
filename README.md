# EaseCommerce — Multi-Courier Integration Platform

A Node.js / Express backend that exposes a **single, courier-agnostic REST API** for creating, tracking and cancelling shipments. The caller passes a `courier_partner` field — the platform routes the request to the right courier, maps schemas, retries on failure, and persists everything to PostgreSQL.

Currently integrated: **UrbaneBolt** (UAT) · **MockCourier** (local dev/testing)

---

## Table of Contents

- [EaseCommerce — Multi-Courier Integration Platform](#easecommerce--multi-courier-integration-platform)
  - [Table of Contents](#table-of-contents)
  - [1. Setup with Docker (recommended)](#1-setup-with-docker-recommended)
    - [Prerequisites](#prerequisites)
    - [First-time setup (single command)](#first-time-setup-single-command)
    - [Service URLs after setup](#service-urls-after-setup)
    - [Connect pgAdmin to the database](#connect-pgadmin-to-the-database)
  - [2. Setup without Docker](#2-setup-without-docker)
    - [Prerequisites](#prerequisites-1)
    - [Steps](#steps)
    - [npm scripts](#npm-scripts)
  - [3. Environment Variables](#3-environment-variables)
  - [4. Available Make Commands](#4-available-make-commands)
  - [5. API Endpoints](#5-api-endpoints)
  - [6. How to Add a New Courier](#6-how-to-add-a-new-courier)
    - [Step 1 — Create the adapter](#step-1--create-the-adapter)
    - [Step 2 — Register it](#step-2--register-it)
  - [7. Assumptions](#7-assumptions)

---

## 1. Setup with Docker (recommended)

### Prerequisites
- Git
- Docker & Docker Compose — the setup command handles installation if missing (Ubuntu only)

### First-time setup (single command)

```bash
git clone <repo-url>
cd EaseCommerce_Backend_Task

cp .env.example .env
# Open .env and set DB_PASSWORD, URBANEBOLT_USERNAME, URBANEBOLT_PASSWORD, URBANEBOLT_CUSTOMER_CODE

make setup
```

`make setup` will:
1. Check if Docker is installed — install it if not (Ubuntu/Debian)
2. Build the Node.js image
3. Pull the PostgreSQL 15 and pgAdmin images
4. Start all three containers
5. Automatically run DB migrations on first boot

### Service URLs after setup

| Service | URL | Credentials |
|---|---|---|
| REST API | http://localhost:3000 | — |
| Swagger UI | http://localhost:3000/api-docs | — |
| pgAdmin | http://localhost:5050 | `admin@admin.com` / `admin` |
| PostgreSQL (direct) | `localhost:5432` | from your `.env` |

### Connect pgAdmin to the database

1. First run this cmd on root - `sudo chmod 777 -R ./docker_volumes_data`
2. Open http://localhost:5050 and log in
3. Right-click **Servers → Register → Server**
4. **General tab** — Name: `easecommerce`
5. **Connection tab**:
   - Host: `database`
   - Port: `5432`
   - Database: value of `DB_NAME` in `.env` (default: `easecommerce`)
   - Username / Password: values of `DB_USER` / `DB_PASSWORD` in `.env`

---

## 2. Setup without Docker

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ running locally

### Steps

```bash
git clone <repo-url>
cd EaseCommerce_Backend_Task

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set DB_HOST=localhost and fill in all other values

# 3. Create the database
createdb easecommerce          # or use psql / pgAdmin

# 4. Run migrations
npm run db:migrate

# 5. (Optional) Load demo seed data
npm run db:seed

# 6. Start the server
npm run dev      # development — auto-reload on file changes
npm start        # production
```

### npm scripts

| Script | Description |
|---|---|
| `npm run dev` | Start with auto-reload (`node --watch`) |
| `npm start` | Start normally |
| `npm run db:migrate` | Run pending migrations |
| `npm run db:migrate:undo` | Undo all migrations |
| `npm run db:seed` | Load seed data |
| `npm run db:reset` | Undo + migrate + seed |

---

## 3. Environment Variables

Copy `.env.example` to `.env` and fill in the required values.

| Variable | Default | Required | Description |
|---|---|---|---|
| `PORT` | `3000` | | HTTP listen port |
| `NODE_ENV` | `development` | | `development` or `production` |
| `DB_HOST` | `localhost` | | PostgreSQL host (`database` when using Docker) |
| `DB_PORT` | `5432` | | PostgreSQL port |
| `DB_NAME` | `easecommerce` | | Database name |
| `DB_USER` | `postgres` | | Database user |
| `DB_PASSWORD` | — | ✓ | Database password |
| `URBANEBOLT_BASE_URL` | `https://uat.urbanebolt.in` | | UrbaneBolt API base URL |
| `URBANEBOLT_USERNAME` | — | ✓ | UrbaneBolt login username |
| `URBANEBOLT_PASSWORD` | — | ✓ | UrbaneBolt login password |
| `URBANEBOLT_CUSTOMER_CODE` | — | ✓ | UrbaneBolt customer code |
| `URBANEBOLT_TIMEOUT` | `10000` | | Request timeout in ms |
| `URBANEBOLT_MAX_RETRIES` | `3` | | Max retries for 5xx / network errors |
| `URBANEBOLT_RETRY_DELAY` | `1000` | | Base delay between retries in ms (doubles each attempt) |
| `BULK_CONCURRENCY` | `10` | | Max concurrent courier calls during bulk processing |

> **Note (Docker):** The `DB_HOST` in `.env` is `localhost` for local dev. When running via Docker Compose the container overrides it to `database` automatically — you don't need to change your `.env`.

---

## 4. Available Make Commands

```bash
make help          # list all commands with descriptions
```

| Command | Description |
|---|---|
| `make setup` | **First-time setup** — install Docker if needed, build & start everything |
| `make up` | Build images and start all services |
| `make down` | Stop and remove containers |
| `make build` | Rebuild images without cache |
| `make logs` | Tail live app logs |
| `make ps` | Show running containers |
| `make shell` | Open a shell inside the app container |
| `make migrate` | Run pending DB migrations |
| `make seed` | Load seed data |
| `make reset-db` | Undo all migrations then re-run them ⚠️ data loss |
| `make psql` | Open a psql console connected to the database |
| `make wipe-all` | Remove containers, volumes and dangling images |
| `make clean` | Alias for `wipe-all` |
| `make pull` | Git pull --rebase on current branch |
| `make push` | Git push --force-with-lease on current branch |

---

## 5. API Endpoints

All responses use this unified envelope:

```json
{
  "success": true,
  "isOperational": true,
  "statusCode": 201,
  "result": {
    "message": "Order created successfully",
    "data": { ... }
  },
  "errors": []
}
```

| Method | Path | Description |
|---|---|---|
| `GET` | `/health-check` | Service liveness |
| `POST` | `/api/v1/orders` | Create a single shipment |
| `GET` | `/api/v1/orders/:order_id/track` | Get status + full tracking history |
| `POST` | `/api/v1/orders/:order_id/cancel` | Cancel a shipment |
| `POST` | `/api/v1/orders/bulk` | Bulk-create up to 100 orders (async) |
| `GET` | `/api/v1/orders/batch/:batch_id` | Poll bulk batch results |
| `GET` | `/api-docs` | Swagger UI — interactive docs for all endpoints |

---

## 6. How to Add a New Courier

Requires changes to **exactly two files**.

### Step 1 — Create the adapter

```
src/adapters/couriers/delhivery/index.js
```

```js
const authenticate = async () => { /* get and cache auth token */ };

const createOrder = async (orderPayload) => {
  // map our normalized schema → Delhivery's schema, call their API
  return {
    courier_order_id: '...',
    awb_number: '...',
    status: 'CREATED',
    raw_response: {},
  };
};

const trackShipment = async (awbNumber) => {
  return {
    status: 'IN_TRANSIT',
    event_time: new Date(),
    location: 'Delhi Hub',
    description: 'In transit',
    history: [],
    raw_response: {},
  };
};

const cancelOrder = async (awbNumber) => {
  return { success: true, raw_response: {} };
};

module.exports = { name: 'delhivery', authenticate, createOrder, trackShipment, cancelOrder };
```

### Step 2 — Register it

Open `src/adapters/couriers/registry.js` and add two lines:

```js
const delhiveryAdapter = require('./delhivery');

const registeredCouriers = [urbaneboltAdapter, mockcourierAdapter, delhiveryAdapter];
```

Done. Controllers, services, routes and validation need no changes.

---

## 7. Assumptions

- `order_id` is the caller's unique identifier and acts as the idempotency key. Submitting the same `order_id` twice returns the existing record without calling the courier again.
- UrbaneBolt tokens are cached in memory for 55 minutes. A 401 mid-request triggers automatic re-auth and one retry.
- Bulk orders are processed asynchronously. The caller polls `GET /api/v1/orders/batch/:batch_id` for results.
- If a courier call fails (5xx / timeout), the error is logged and a 502 is returned to the caller. Raw courier errors are never forwarded to API consumers.
- Retry logic applies to 5xx and network errors only. 4xx errors are not retried.