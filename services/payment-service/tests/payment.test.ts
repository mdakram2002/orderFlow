import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/db", () => ({
  pool: { query: vi.fn() },
}));

import { pool } from "../src/db";
import { processPayment } from "../src/payment";

describe("processPayment", () => {
  beforeEach(() => vi.mocked(pool.query).mockReset());

  it("returns the stored result for a repeated idempotency key", async () => {
    vi.mocked(pool.query).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: "payment-1",
        status: "SUCCESS",
        order_id: "order-1",
        user_id: "user-1",
        amount: "1000",
        currency: "INR",
        idempotency_key: "payment-order-1",
      }],
    } as never);
    await expect(processPayment({
      orderId: "order-1", userId: "user-1", amountMinor: 1000,
      currency: "INR", idempotencyKey: "payment-order-1",
    })).resolves.toEqual({ paymentId: "payment-1", status: "SUCCESS", errorCode: "" });
    expect(pool.query).toHaveBeenCalledTimes(1);
  });
});
