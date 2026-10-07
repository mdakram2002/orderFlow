import { app } from "./app";
import { config } from "./config";
import { pool } from "./db";
import { startGrpcServer } from "./grpc";

const grpcServer = startGrpcServer();
const httpServer = app.listen(config.port, () => {
  console.log(JSON.stringify({ service: "payment-service", level: "INFO", message: "Service started" }));
});

const shutdown = () => {
  httpServer.close();
  grpcServer.forceShutdown();
  void pool.end();
};
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);

