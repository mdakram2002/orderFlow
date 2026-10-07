export const config = {
  port: Number(process.env.PORT ?? 8004),
  grpcPort: Number(process.env.GRPC_PORT ?? 50054),
  databaseUrl: process.env.DATABASE_URL ?? "postgresql://orderflow:orderflow_dev_only@localhost:5432/payment_db",
  paymentMode: process.env.PAYMENT_MODE ?? "success",
};
