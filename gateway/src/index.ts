import { app, configureRateLimiters, redis } from "./app";
import { config } from "./config";

async function start(): Promise<void> {
  if (!config.jwtSecret || config.jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters");
  }
  await redis.connect();
  configureRateLimiters();
  const server = app.listen(config.port, () => {
    console.log(JSON.stringify({ service: "api-gateway", level: "INFO", message: "Gateway started", port: config.port }));
  });
  const shutdown = async () => {
    server.close();
    await redis.quit();
  };
  process.once("SIGTERM", () => void shutdown());
  process.once("SIGINT", () => void shutdown());
}

start().catch((error: unknown) => {
  console.error(JSON.stringify({ service: "api-gateway", level: "ERROR", message: "Startup failed", error }));
  process.exit(1);
});
