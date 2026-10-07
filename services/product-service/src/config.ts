export const config = {
  port: Number(process.env.PORT ?? 8002),
  grpcPort: Number(process.env.GRPC_PORT ?? 50052),
  mongoUri: process.env.MONGODB_URI ?? "mongodb://localhost:27017/orderflow",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379/0",
  cacheTtlSeconds: Number(process.env.PRODUCT_CACHE_TTL_SECONDS ?? 300),
  seedDemoData: process.env.SEED_DEMO_DATA === "true",
};
