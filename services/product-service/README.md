# Product Service

Express/MongoDB catalog owner with Redis cache-aside reads and gRPC inventory operations. Inventory is reserved using a conditional MongoDB update that decrements stock only when enough units remain; the order ID is retained on the product document so reservation retries are idempotent. `npm test` runs focused inventory tests; `npm run build` performs strict TypeScript compilation.

