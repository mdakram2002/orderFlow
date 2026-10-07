import path from "node:path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { config } from "./config";
import { Product } from "./models/product";
import { releaseInventory, reserveInventory } from "./inventory";

export function startGrpcServer(): grpc.Server {
  const protoPath = path.resolve(process.cwd(), "proto/product.proto");
  const definition = protoLoader.loadSync(protoPath, { keepCase: false, longs: String, defaults: true });
  const loaded = grpc.loadPackageDefinition(definition) as any;
  const service = loaded.orderflow.product.v1.ProductService.service;
  const server = new grpc.Server();
  server.addService(service, {
    GetProduct: async (call: any, callback: grpc.sendUnaryData<unknown>) => {
      try {
        const product = await Product.findById(call.request.productId).select("-reservations").lean();
        if (!product) return callback({ code: grpc.status.NOT_FOUND, message: "Product was not found" });
        return callback(null, {
          productId: product._id.toString(),
          name: product.name,
          category: product.category,
          priceMinor: product.priceMinor,
          currency: product.currency,
          stock: product.stock,
          found: true,
        });
      } catch (error) {
        return callback({ code: grpc.status.INTERNAL, message: "Product lookup failed" });
      }
    },
    CheckInventory: async (call: any, callback: grpc.sendUnaryData<unknown>) => {
      try {
        const product = await Product.findById(call.request.productId).select("stock").lean();
        return callback(null, {
          available: Boolean(product && product.stock >= call.request.quantity),
          availableQuantity: product?.stock ?? 0,
        });
      } catch {
        return callback({ code: grpc.status.UNAVAILABLE, message: "Inventory lookup failed" });
      }
    },
    ReserveInventory: async (call: any, callback: grpc.sendUnaryData<unknown>) => {
      try {
        const result = await reserveInventory(
          call.request.orderId, call.request.productId, Number(call.request.quantity),
        );
        return callback(null, result);
      } catch {
        return callback({ code: grpc.status.UNAVAILABLE, message: "Inventory reservation failed" });
      }
    },
    ReleaseInventory: async (call: any, callback: grpc.sendUnaryData<unknown>) => {
      try {
        const released = await releaseInventory(
          call.request.orderId, call.request.productId, Number(call.request.quantity),
        );
        return callback(null, { released });
      } catch {
        return callback({ code: grpc.status.UNAVAILABLE, message: "Inventory release failed" });
      }
    },
  });
  server.bindAsync(`0.0.0.0:${config.grpcPort}`, grpc.ServerCredentials.createInsecure(), (error) => {
    if (error) throw error;
  });
  return server;
}
