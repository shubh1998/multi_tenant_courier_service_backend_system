# DESIGN.md — Architecture & Design Decisions

## 1. Architecture Overview

```
HTTP Request
    │
    ▼
Express Router  (/api/v1/orders/*)
    │
    ▼
Joi Validation Middleware     ← validates input, strips unknown fields
    │
    ▼
Order Controller              ← thin layer, calls service, sends response
    │
    ▼
Order Service                 ← all business logic (idempotency, DB writes, error mapping)
    │          │                 │
    ▼          ▼                 ▼
Courier    DB Models          Logger
Registry   (Sequelize/PG)
    │
    ▼
Courier Adapter (urbanebolt / mockcourier / ...)
    │
    ▼
External Courier API
```

The system is strictly layered. Each layer only communicates with its direct neighbour — controllers don't touch the DB, services don't format HTTP responses, adapters don't know about our data models.

---

## 2. Design Pattern: Adapter + Registry

### Problem

Every courier has a different auth mechanism, different request schema, different response structure, and different error formats. If you hardcode courier-specific logic into the service layer, adding a new courier means touching core business logic — which is fragile and error-prone.

### Solution

The **Adapter pattern** defines a fixed interface that every courier must implement:

```js
{
  name: 'couriername',
  authenticate: async () => {},
  createOrder: async (normalizedPayload) => { /* returns { courier_order_id, awb_number, status, raw_response } */ },
  trackShipment: async (awbNumber)       => { /* returns { status, event_time, location, description, history[], raw_response } */ },
  cancelOrder: async (awbNumber)         => { /* returns { success, raw_response } */ },
}
```

The service only ever calls these four functions. It has no idea whether it's talking to UrbaneBolt, Delhivery, or any other partner.

The **Registry** (`registry.js`) maps string identifiers (`"urbanebolt"`, `"mockcourier"`) to adapter modules. It's the only place that needs to change when a new courier is onboarded.

### Result

Adding a new courier requires:
1. Create one new file: `src/adapters/couriers/newcourier/index.js`
2. Add it to the array in `src/adapters/couriers/registry.js`

Zero changes to controllers, services, routes, or validation.

---

## 3. Database Schema

### orders

Stores one row per order. The `internal_order_id` column is the unique idempotency key.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | Auto-generated |
| `internal_order_id` | VARCHAR(100) UNIQUE | Caller's own order ID — the idempotency key |
| `courier_partner` | VARCHAR(50) | e.g. `urbanebolt` |
| `courier_order_id` | VARCHAR(100) | Shipment ID returned by the courier |
| `awb_number` | VARCHAR(100) | Air Waybill / tracking number from courier |
| `status` | ENUM | `CREATED`, `PICKED_UP`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`, `FAILED`, `RTO_INITIATED`, `RTO_DELIVERED` |
| `request_payload` | JSONB | Full normalized payload we sent to the courier |
| `response_payload` | JSONB | Full response we received from the courier |
| `batch_id` | VARCHAR(100) | Links to `batch_jobs.batch_id` for bulk orders |
| `failure_reason` | TEXT | Sanitised error message if creation failed |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### tracking_events (append-only)

Every status update from the courier appends a new row. Rows are never updated or deleted — this gives a full, immutable audit trail.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `order_id` | UUID FK → orders.id | |
| `status` | VARCHAR(50) | Normalised status at this point in time |
| `event_time` | TIMESTAMPTZ | When the event actually happened (courier's timestamp) |
| `location` | VARCHAR(255) | Hub/city location from courier |
| `description` | TEXT | Human-readable description |
| `raw_payload` | JSONB | Raw response payload from the courier for this event |
| `created_at` | TIMESTAMPTZ | When we recorded this event |

### batch_jobs

Tracks the progress of bulk requests. Created when a bulk request is received, updated as orders are processed in the background.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `batch_id` | VARCHAR(100) UNIQUE | Returned to caller immediately |
| `total_orders` | INTEGER | |
| `processed_orders` | INTEGER | |
| `successful_orders` | INTEGER | |
| `failed_orders` | INTEGER | |
| `status` | ENUM | `PROCESSING`, `COMPLETED`, `PARTIAL_SUCCESS`, `FAILED` |
| `results` | JSONB | Per-order `{ order_id, success, awb_number / error }` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

## 4. Bulk Order Processing

### Strategy: Background fan-out, return batch_id immediately

```
POST /api/v1/orders/bulk
  ├─ Validate all orders (Joi)
  ├─ Generate batch_id
  ├─ Create BatchJob record (status=PROCESSING)
  ├─ Fire off background processing (not awaited)
  └─ Return 202 Accepted { batch_id, total_orders, status: "PROCESSING" }

Background:
  └─ p-limit(BULK_CONCURRENCY) — e.g. 10 concurrent calls
       ├─ createOrder(orders[0])
       ├─ createOrder(orders[1])
       └─ createOrder(orders[99])
  └─ Promise.allSettled — never throws, captures per-order failures
  └─ Update BatchJob with final results
```

**Why return immediately vs wait?**
With 100 orders and each courier call taking ~2s, waiting would mean a ~20s HTTP response at 10x concurrency. That's too slow for an API and risks gateway timeouts. Returning immediately and letting the client poll is a much better user experience.

**Trade-offs:**

| Approach | Pros | Cons |
|---|---|---|
| Return `batch_id` immediately (chosen) | Fast response, no timeout risk | Client must poll, extra network round-trips |
| Wait for all orders, return full results | Single request/response | Timeout risk, slow response |
| Job queue (BullMQ/SQS) | Scalable, retryable, durable | Needs worker process, more infrastructure |

For this assignment, the `batch_id` approach is the right trade-off. In production at scale, a proper job queue would be the upgrade path.

**Idempotency in bulk:** Each order's `order_id` is checked against the `internal_order_id` unique constraint before calling the courier. Sending the same `order_id` in two separate bulk requests won't create a duplicate shipment.

---

## 5. Error Handling

### Error flow

```
Bad input (Joi)      → 400 with field-level errors[]
Unknown courier      → 400 with supported couriers list
Courier 4xx/5xx      → 502 "Courier service returned an error" (no raw courier error leaked)
Courier network/timeout → retry with backoff → 502 if all retries fail
Courier 401          → invalidate token + re-auth + one retry → 502 if still fails
```

**Key rule:** Courier-specific error payloads are never forwarded to API consumers. The `normalizeCourierError()` function in the service converts any courier error into a safe, generic message. The raw response is stored in the DB for debugging.

### Retry strategy

Retries are handled by **`axios-retry`**, configured per courier inside `src/helpers/axios.helper.js`:

- Applied to: network errors, 5xx responses
- Not applied to: 4xx errors (retrying won't help — the request is wrong)
- Back-off: `delay = baseDelay * 2^(attempt-1)` e.g. 1s → 2s → 4s
- Configurable per courier: `URBANEBOLT_MAX_RETRIES`, `URBANEBOLT_RETRY_DELAY`

### UrbaneBolt token expiry

Tokens are cached in memory with a 55-minute TTL. If we receive a 401 mid-request (token expired earlier than expected), we clear the cache, re-authenticate, and retry the request once. If it fails again, we throw.

---

## 6. Configuration

Everything configurable lives in `src/config/app.config.js` which reads from `process.env`. No values are hardcoded. See `.env.example` for the full list.

---

## 7. Request Context & Transactions

Every incoming request goes through `contextMiddleware` (in `src/middlewares/context.middleware.js`) which attaches a context object to `req.context`:

| Field | Contents |
|---|---|
| `traceId` | UUID taken from `x-trace-id` / `x-request-id` header, or auto-generated. Echoed back in the `x-trace-id` response header. |
| `dbModels` | All Sequelize model classes (Order, TrackingEvent, BatchJob) |
| `sequelize` | The Sequelize connection instance |
| `logger` | Shared application logger |
| `reqTimeStamp` | Epoch ms at request arrival |

The middleware is composable:
- `contextMiddleware(false)` — traceId + lifecycle logging only (used on read routes)
- `contextMiddleware(true)` — additionally opens a Sequelize transaction, commits on 2xx, rolls back on 4xx/5xx

The service layer receives the full context as its first argument, destructures `dbModels` and `sequelizeTransaction` from it, and passes `{ transaction: t }` to every DB write. Transaction lifecycle is managed entirely by the middleware — the service has zero transaction management code.

**Lifecycle logging** is emitted at request start and finish:
```
[traceId] → POST /api/v1/orders
[traceId] ← 201 POST /api/v1/orders duration=45ms
```

---

## 8. Security

- `helmet` sets secure HTTP headers on every response
- `cors` configured to allow any origin (adjust in production)
- Joi strips unknown fields from all request bodies before they reach business logic
- Courier credentials are environment variables — not in source code
- Raw courier responses are stored in JSONB for audit but never sent to API consumers
- All DB queries go through Sequelize ORM — no raw SQL / no injection risk

---

## 9. Trade-offs & Future Improvements

| Area | Current state | Upgrade path |
|---|---|---|
| Token cache | In-memory, single process | Redis for multi-process / multi-instance |
| Bulk processing | Background async in-process | BullMQ / SQS for durable, restartable jobs |
| Auth on our API | None (internal service) | JWT or API key middleware |
| Rate limiting | None | `express-rate-limit` per IP/key |
| Logging | File-based custom logger | Winston + structured JSON logs + Datadog/CloudWatch |
| Tests | Not included (assignment scope) | Jest + nock for HTTP mocking, Supertest for integration tests |
| Token persistence | In-memory only | Survive process restarts with Redis |
