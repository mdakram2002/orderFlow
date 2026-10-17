# End-to-end tests

Start the complete Compose stack, then run these commands from this directory:

```powershell
npm ci
npx playwright install chromium
npm test
```

The browser journey creates a fresh customer through the API, signs in using the `/account` page, shops from `/shop`, checks out from `/cart`, and verifies `/orders` and the order details page. Defaults are `PLAYWRIGHT_BASE_URL=http://localhost:30001` and `API_BASE_URL=http://localhost:30000/api`.

See the repository [SETUP.md](../../SETUP.md) for the full local setup and troubleshooting guide.
