import { describe, expect, it, vi } from "vitest";

vi.mock("../src/models/product", () => ({
  Product: { findOneAndUpdate: vi.fn().mockResolvedValue({ stock: 3 }), exists: vi.fn() },
}));
vi.mock("../src/cache", () => ({
  redis: { del: vi.fn().mockResolvedValue(1) },
  productCacheKey: (id: string) => `product:${id}`,
}));

import { reserveInventory } from "../src/inventory";
import { Product } from "../src/models/product";

describe("reserveInventory", () => {
  it("uses an atomic conditional update for reservations", async () => {
    const result = await reserveInventory("order-1", "product-1", 2);
    expect(result.reserved).toBe(true);
    expect(Product.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ stock: { $gte: 2 } }),
      expect.objectContaining({ $inc: { stock: -2 } }),
      { new: true },
    );
  });

  it("rejects non-positive quantities", async () => {
    expect(await reserveInventory("order-1", "product-1", 0)).toEqual({
      reserved: false, reason: "INVALID_RESERVATION",
    });
  });
});
