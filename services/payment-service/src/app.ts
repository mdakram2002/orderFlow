import express from "express";
import { pool } from "./db";

export const app = express();
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    return res.json({ service: "payment-service", status: "healthy", database: "healthy" });
  } catch {
    return res.status(503).json({ service: "payment-service", status: "unhealthy" });
  }
});

app.get("/internal/payments/:orderId", async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT id, order_id, user_id, amount, currency, status, created_at FROM payments WHERE order_id = $1",
      [req.params.orderId],
    );
    if (!result.rowCount) return res.status(404).json({ detail: "Payment was not found" });
    return res.json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(JSON.stringify({ service: "payment-service", level: "ERROR", message: "Request failed", error }));
  return res.status(500).json({ detail: "Internal service error" });
});

