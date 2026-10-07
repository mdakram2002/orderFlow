export const config = {
  port: Number(process.env.PORT ?? 3000),
  jwtSecret: process.env.JWT_SECRET ?? "",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379/0",
  userServiceUrl: process.env.USER_SERVICE_URL ?? "http://localhost:8001",
  productServiceUrl: process.env.PRODUCT_SERVICE_URL ?? "http://localhost:8002",
  orderServiceUrl: process.env.ORDER_SERVICE_URL ?? "http://localhost:8003",
  frontendOrigins: [
    ...(process.env.FRONTEND_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    ...(process.env.NODE_ENV === "production"
      ? []
      : ["http://localhost:3000", "http://localhost:3001"]),
  ],
  downstreamTimeoutMs: Number(process.env.DOWNSTREAM_TIMEOUT_MS ?? 15_000),
};
