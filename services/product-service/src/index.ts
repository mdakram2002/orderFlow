import mongoose from "mongoose";
import { app } from "./app";
import { redis } from "./cache";
import { config } from "./config";
import { startGrpcServer } from "./grpc";
import { Product } from "./models/product";

async function start(): Promise<void> {
  await mongoose.connect(config.mongoUri);
  await Product.init();
  if (config.seedDemoData && await Product.estimatedDocumentCount() === 0) {
    await Product.create({
      name: "OrderFlow Demo Notebook",
      description: "A sample catalog item for the local checkout journey.",
      category: "Accessories",
      priceMinor: 499900,
      currency: "INR",
      stock: 25,
      attributes: { color: "Graphite", warranty: "1 year" },
    });
  }
  await redis.connect();
  const grpcServer = startGrpcServer();
  const httpServer = app.listen(config.port, () => {
    console.log(JSON.stringify({ service: "product-service", level: "INFO", message: "Service started", port: config.port }));
  });
  const shutdown = async () => {
    httpServer.close();
    grpcServer.forceShutdown();
    await Promise.all([mongoose.disconnect(), redis.quit()]);
  };
  process.once("SIGTERM", () => void shutdown());
  process.once("SIGINT", () => void shutdown());
}

start().catch((error: unknown) => {
  console.error(JSON.stringify({ service: "product-service", level: "ERROR", message: "Startup failed", error }));
  process.exit(1);
});
