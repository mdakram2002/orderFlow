# OrderFlow

OrderFlow is a sample e-commerce application built as a set of independently runnable services. It demonstrates REST and gRPC APIs, a Redis-backed cart and cache, an order saga, and asynchronous order notifications.

## Architecture

```text
Browser -> Next.js frontend -> API Gateway -> User, Product, Order, Payment services
                                                   |
                                          PostgreSQL / MongoDB
                                                   |
                                   Order outbox -> Redis Stream
                                                   |
                                          BullMQ notification queue
                                                   |
                                      Notification worker (mock output)
```

Order status events are committed to the order service's database outbox. The outbox publisher sends them to the `order-events` Redis Stream. The notification service enqueues them into BullMQ's `order-notifications` queue and acknowledges the stream event after the queue accepts it. BullMQ retries failed jobs with exponential backoff. The current notification handler logs a mock email; it does not send email or push browser notifications.

## Services

| Service | Runtime | Responsibility |
| --- | --- | --- |
| `frontend` | Next.js, React | Customer storefront |
| `gateway` | Node.js, TypeScript, Express | Public REST API, JWT validation, authorization, rate limits |
| `user-service` | Python, FastAPI, PostgreSQL | Registration, authentication, user data |
| `product-service` | Node.js, TypeScript, MongoDB, Redis | Catalog and inventory |
| `order-service` | Python, FastAPI, PostgreSQL, Redis | Cart, order saga, durable event outbox |
| `payment-service` | Node.js, TypeScript, PostgreSQL | Idempotent mock payments |
| `notification-service` | Node.js, BullMQ, Redis | Stream bridge and asynchronous notification worker |

## Start the application

Requirements: Docker Desktop running with Linux containers and Docker Compose v2.

1. Create the local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Set `JWT_SECRET` in `.env` to a random value of at least 32 characters. The example credentials are for local development only.
3. From the repository root, build and start all services:

   ```powershell
   docker compose up --build
   ```

   To run in the background, add `-d`:

   ```powershell
   docker compose up --build -d
   ```

Open the storefront at <http://localhost:30001> and the API gateway at <http://localhost:30000>. Check container health with `docker compose ps`, view logs with `docker compose logs -f`, and stop the stack with `docker compose down`.

Local database ports are bound to loopback: PostgreSQL `15432`, MongoDB `27018`, and Redis `16379`. The services communicate over the Compose network. Compose reads `.env` for variable substitution and passes only each service's explicitly declared environment variables into its container.

## Configuration and security

Start from `.env.example`. Keep `.env` out of source control; it is ignored by Git. Do not use the example passwords or JWT secret outside local development. The production Compose overlay requires `GHCR_OWNER`, `POSTGRES_PASSWORD`, `JWT_SECRET`, `USER_DATABASE_URL`, `ORDER_DATABASE_URL`, `PAYMENT_DATABASE_URL`, `MONGODB_URI`, and `REDIS_URL`. Use protected deployment secrets and a TLS-enabled `rediss://` Redis URL in production.

The notification service uses a stable `CONSUMER_NAME` so it can resume that consumer's pending Redis Stream entries after a restart. Use a distinct stable name for each replica. `NOTIFICATION_CONCURRENCY` controls each worker's concurrent job count. `NOTIFICATION_QUEUE_NAME`, `STREAM_NAME`, and `CONSUMER_GROUP` can also be configured in `.env`.

## API

Public routes are served under `/api`:

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Public | Register a customer |
| `POST` | `/auth/login` | Public | Authenticate |
| `GET` | `/products` | Public | List products |
| `GET` | `/products/:id` | Public | Get a product |
| `GET` | `/products/search?q=` | Public | Search products |
| `POST` | `/products` | Admin | Create a product |
| `PATCH` | `/products/:id` | Admin | Update product details or stock |
| `DELETE` | `/products/:id` | Admin | Delete a product |
| `POST` | `/cart` | Customer | Replace the cart |
| `GET` | `/cart` | Customer | Read the cart |
| `POST` | `/cart/items` | Customer | Add cart items |
| `DELETE` | `/cart/items/:productId` | Customer | Remove a cart item |
| `POST` | `/orders` | Customer | Place an order |
| `GET` | `/orders` | Customer or Admin | List orders |
| `GET` | `/orders/:id` | Customer or Admin | Read an order |
| `POST` | `/orders/:id/cancel` | Customer or Admin | Cancel an eligible order |
| `GET` | `/health` | Public | Check gateway health |

Internal services expose `/health`; FastAPI services also expose `/docs`. Service contracts are in [`proto/`](proto/).

## Development checks

Run Python tests from each service directory:

```powershell
cd services/user-service; pytest tests
cd ../order-service; pytest tests
```

Run Node tests and TypeScript builds:

```powershell
cd gateway; npm ci; npm test; npm run build
cd ../services/product-service; npm ci; npm test; npm run build
cd ../payment-service; npm ci; npm test; npm run build
cd ../notification-service; npm ci; npm run check
```

The browser journey is in [`tests/e2e/`](tests/e2e/). CI runs service checks, builds the Docker images, and runs the end-to-end journey against Compose.

## Production deployment

See [`infrastructure/aws/README.md`](infrastructure/aws/README.md). The production overlay uses published GHCR images and requires explicit configuration for deployment credentials and data services. Keep secrets in a protected environment and restrict database and Redis access to the application network.