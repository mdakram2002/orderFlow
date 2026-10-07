import path from "node:path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { config } from "./config";
import { PaymentConflictError, processPayment } from "./payment";

export function startGrpcServer(): grpc.Server {
  const definition = protoLoader.loadSync(path.resolve(process.cwd(), "proto/payment.proto"), {
    keepCase: false, longs: String, defaults: true,
  });
  const loaded = grpc.loadPackageDefinition(definition) as any;
  const server = new grpc.Server();
  server.addService(loaded.orderflow.payment.v1.PaymentService.service, {
    ProcessPayment: async (call: any, callback: grpc.sendUnaryData<unknown>) => {
      try {
        const result = await processPayment({
          orderId: call.request.orderId,
          userId: call.request.userId,
          amountMinor: Number(call.request.amountMinor),
          currency: call.request.currency,
          idempotencyKey: call.request.idempotencyKey,
        });
        callback(null, {
          paymentId: result.paymentId,
          status: result.status,
          errorCode: result.errorCode,
        });
      } catch (error) {
        callback({
          code: error instanceof PaymentConflictError ? grpc.status.ALREADY_EXISTS : grpc.status.INTERNAL,
          message: error instanceof PaymentConflictError ? error.message : "Payment processing failed",
        });
      }
    },
  });
  server.bindAsync(`0.0.0.0:${config.grpcPort}`, grpc.ServerCredentials.createInsecure(), (error) => {
    if (error) throw error;
  });
  return server;
}
