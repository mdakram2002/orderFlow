# OrderFlow setup guide

This guide covers running the application locally, exercising its customer journey, and diagnosing common startup issues. For architecture, service responsibilities, order processing, and API routes, see the [README](README.md).

## Requirements

- Docker Desktop running with Linux containers.
- Docker Compose v2.
- PowerShell on Windows, or a shell that can run Docker Compose commands.
- Node.js 22 and Python 3.12 only if you plan to run service checks outside Docker.

The first Docker build downloads base images and dependencies, so it needs network access.

## Configure the environment

From the repository root, create the local environment file if it does not already exist:

```powershell
Copy-Item .env.example .env
```

Set `JWT_SECRET` in `.env` to a private random value of at least 32 characters. Keep `.env` out of Git; it is ignored by the repository. The other example values are for local development and must not be used for a public deployment.

Useful local settings:

| Variable | Local purpose | Default |
| --- | --- | --- |
| `JWT_SECRET` | Signs and validates access tokens | Must be set locally |
| `PAYMENT_MODE` | Selects the mock payment outcome | `success` (`failed` exercises the rejection path) |
| `SEED_DEMO_DATA` | Adds the sample catalog product to an empty catalog | `true` |
| `GATEWAY_HOST_PORT` | Host port for the API gateway | `30000` |
| `FRONTEND_HOST_PORT` | Host port for the storefront container | `30001` |
| `POSTGRES_PASSWORD` | Local PostgreSQL password | Development-only default |

See [.env.example](.env.example) for the full list of supported variables. Compose passes each service only its declared environment variables.

## Start the full application

From the repository root:

```powershell
docker compose up --build
```

Compose builds the services, waits for their declared health checks, and starts database migrations automatically. For background mode:

```powershell
docker compose up --build -d
docker compose ps
```

Open the storefront at <http://localhost:30001>. The API gateway is at <http://localhost:30000>; its health endpoint is <http://localhost:30000/health>.

The storefront has separate Home, Shop, About, Account, Cart, Orders, Product, and Order Details pages. Create an account at `/account`, then sign in to add products and check out. The demo payment provider is mocked; `PAYMENT_MODE=success` confirms orders and `PAYMENT_MODE=failed` exercises payment rejection. Notifications are mock logs and are not sent to customers.

## Run the frontend separately

To develop the Next.js frontend outside Docker while keeping backend services in Compose, start the Compose stack, then in another PowerShell window:

```powershell
Set-Location frontend
npm ci
npm run dev
```

Open <http://localhost:3000>. The frontend rewrites `/api` requests to the gateway at `http://localhost:30000` by default. If the gateway uses a different host port, set `API_GATEWAY_URL` before starting Next.js:

```powershell
$env:API_GATEWAY_URL = "http://localhost:30000"
npm run dev
```

## Verify the services

Check service health and inspect logs:

```powershell
docker compose ps
docker compose logs -f
docker compose logs -f gateway user-service
```

The order and payment database migrations run when those containers start. To restart after changing configuration or code:

```powershell
docker compose up --build -d
```

Stop the containers while keeping local database data:

```powershell
docker compose down
```

Remove containers and local database volumes (this permanently deletes local data):

```powershell
docker compose down --volumes
```

## Run automated checks

Run Python checks from each Python service directory after installing its requirements:

```powershell
Set-Location services/user-service
python -m pip install -r requirements.txt
python -m pytest tests

Set-Location ../order-service
python -m pip install -r requirements.txt
python -m pytest tests
```

Run Node service checks from their directories:

```powershell
Set-Location gateway
npm ci
npm test
npm run build

Set-Location ../services/product-service
npm ci
npm test
npm run build

Set-Location ../payment-service
npm ci
npm test
npm run build

Set-Location ../notification-service
npm ci
npm run check
```

Build the frontend with `npm ci` and `npm run build` from `frontend`.

## Run the browser journey

Start the full Compose stack first. Then, from `tests/e2e`:

```powershell
npm ci
npx playwright install chromium
npm test
```

The Playwright journey creates a fresh account through the API, signs in through the storefront, adds a product, checks out, and verifies the order history and details page. By default it uses the storefront at port `30001` and gateway at port `30000`; override `PLAYWRIGHT_BASE_URL` or `API_BASE_URL` to use different host ports.

## Troubleshooting

### Registration or login returns HTTP 500

The frontend depends on the gateway and user service. Check that Docker is running and all containers are healthy:

```powershell
docker compose ps
docker compose logs --tail=100 gateway user-service postgres
```

Start or rebuild the stack with `docker compose up --build -d`, wait for healthy status, then retry. A stopped gateway can make the frontend show a generic server error even when its forms are working.

### The account already exists

Registration requires a unique email. Sign in with that account, or use a different email for a new registration. Passwords must satisfy the minimum length shown by the account form.

### The product list is empty

Check `SEED_DEMO_DATA=true`, then inspect the product service:

```powershell
docker compose logs --tail=100 product-service mongo
```

Demo data is inserted when the catalog is empty. If the database already contains products, the seed does not overwrite them.

### The browser test cannot find a page element

Make sure Compose is running the current frontend image (`docker compose up --build -d`) and rerun Playwright. The E2E journey follows the separate account, shop, cart, and order pages.

### Ports are already in use

Change `GATEWAY_HOST_PORT` or `FRONTEND_HOST_PORT` in `.env`, then restart Compose. For the local frontend dev server, use a free port or stop the process already using port `3000`.
