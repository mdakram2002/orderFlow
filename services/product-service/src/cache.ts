import { createClient } from "redis";
import { config } from "./config";

export const redis = createClient({ url: config.redisUrl });
redis.on("error", (error) => console.error(JSON.stringify({
  service: "product-service",
  level: "ERROR",
  message: "Redis client error",
  error: error.message,
})));

export function productCacheKey(id: string): string {
  return `product:${id}`;
}

