# AWS EC2 deployment

See the deployment guide in the root README. Production deployments should use EC2 for stateless containers and managed data services (RDS PostgreSQL, MongoDB Atlas, and ElastiCache) rather than placing durable databases on the application instance.

The production Compose overlay fails closed unless `GHCR_OWNER`, `POSTGRES_PASSWORD`, `JWT_SECRET`, all three database URLs, `MONGODB_URI`, and a secured `REDIS_URL` are configured. Put these values in a protected deployment environment; do not use the example credentials. Use `rediss://` for Redis TLS. Compose interpolates `.env` locally but passes only each service's declared variables into its container.

