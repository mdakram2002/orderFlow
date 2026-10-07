import { randomUUID } from "node:crypto";
import { config } from "./config";
import { pool } from "./db";

export type PaymentResult = {
  paymentId: string;
  status: "SUCCESS" | "FAILED";
  errorCode: string;
};

export class PaymentConflictError extends Error {}

export async function processPayment(input: {
  orderId: string;
  userId: string;
  amountMinor: number;
  currency: string;
  idempotencyKey: string;
}): Promise<PaymentResult> {
  if (!input.idempotencyKey) throw new Error("Idempotency key is required");
  const existing = await pool.query(
    "SELECT id, status, order_id, user_id, amount, currency, idempotency_key FROM payments WHERE idempotency_key = $1 OR order_id = $2 LIMIT 1",
    [input.idempotencyKey, input.orderId],
  );
  if (existing.rowCount) {
    const prior = existing.rows[0];
    if (
      prior.order_id !== input.orderId || prior.user_id !== input.userId ||
      Number(prior.amount) !== input.amountMinor || prior.currency !== input.currency ||
      prior.idempotency_key !== input.idempotencyKey
    ) {
      throw new PaymentConflictError("Payment request conflicts with the existing order payment");
    }
    return {
      paymentId: prior.id,
      status: prior.status,
      errorCode: prior.status === "FAILED" ? "PAYMENT_DECLINED" : "",
    };
  }

  const status = config.paymentMode === "failed" ? "FAILED" : "SUCCESS";
  const paymentId = randomUUID();
  const inserted = await pool.query(
    `INSERT INTO payments (id, order_id, user_id, amount, currency, status, idempotency_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT DO NOTHING
     RETURNING id, status`,
    [paymentId, input.orderId, input.userId, input.amountMinor, input.currency, status, input.idempotencyKey],
  );
  if (inserted.rowCount) {
    return { paymentId, status, errorCode: status === "FAILED" ? "PAYMENT_DECLINED" : "" };
  }

  const raced = await pool.query(
    "SELECT id, status, order_id, user_id, amount, currency, idempotency_key FROM payments WHERE idempotency_key = $1 OR order_id = $2 LIMIT 1",
    [input.idempotencyKey, input.orderId],
  );
  if (!raced.rowCount) throw new Error("Payment idempotency conflict could not be resolved");
  const prior = raced.rows[0];
  if (
    prior.order_id !== input.orderId || prior.user_id !== input.userId ||
    Number(prior.amount) !== input.amountMinor || prior.currency !== input.currency ||
    prior.idempotency_key !== input.idempotencyKey
  ) {
    throw new PaymentConflictError("Payment request conflicts with the existing order payment");
  }
  return {
    paymentId: prior.id,
    status: prior.status,
    errorCode: prior.status === "FAILED" ? "PAYMENT_DECLINED" : "",
  };
}
