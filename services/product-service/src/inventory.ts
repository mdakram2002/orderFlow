import { Product } from "./models/product";
import { productCacheKey, redis } from "./cache";

export async function reserveInventory(
  orderId: string,
  productId: string,
  quantity: number,
): Promise<{ reserved: boolean; reason: string }> {
  if (!orderId || quantity < 1 || !Number.isInteger(quantity)) {
    return { reserved: false, reason: "INVALID_RESERVATION" };
  }
  const product = await Product.findOneAndUpdate(
    {
      _id: productId,
      stock: { $gte: quantity },
      reservations: { $not: { $elemMatch: { orderId } } },
    },
    { $inc: { stock: -quantity }, $push: { reservations: { orderId, quantity } } },
    { new: true },
  );
  if (product) {
    await redis.del(productCacheKey(productId));
    return { reserved: true, reason: "" };
  }

  const existing = await Product.exists({
    _id: productId,
    reservations: { $elemMatch: { orderId, quantity } },
  });
  if (existing) return { reserved: true, reason: "ALREADY_RESERVED" };
  return { reserved: false, reason: "INSUFFICIENT_STOCK_OR_PRODUCT_NOT_FOUND" };
}

export async function releaseInventory(
  orderId: string,
  productId: string,
  quantity: number,
): Promise<boolean> {
  const product = await Product.findOneAndUpdate(
    { _id: productId, reservations: { $elemMatch: { orderId, quantity } } },
    { $inc: { stock: quantity }, $pull: { reservations: { orderId, quantity } } },
    { new: true },
  );
  if (product) {
    await redis.del(productCacheKey(productId));
    return true;
  }
  const [productExists, reservationExists] = await Promise.all([
    Product.exists({ _id: productId }),
    Product.exists({ _id: productId, "reservations.orderId": orderId }),
  ]);
  return Boolean(productExists && !reservationExists);
}
