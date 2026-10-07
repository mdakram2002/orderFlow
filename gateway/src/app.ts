import cors from "cors";
import express, { NextFunction, Request, RequestHandler, Response } from "express";
import { createClient } from "redis";
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { z } from "zod";
import { config } from "./config";
import { authenticate, errorResponse, requestContext, requireRole } from "./middleware";
import { forward } from "./proxy";
import { AuthenticatedRequest } from "./types";

export const redis = createClient({ url: config.redisUrl });
redis.on("error", (error) => console.error(JSON.stringify({
  service: "api-gateway", level: "ERROR", message: "Redis client error", error: error.message,
})));

export const app = express();
app.disable("x-powered-by");
const allowedOrigins = new Set(config.frontendOrigins);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
}));
app.use(express.json({ limit: "1mb" }));
app.use(requestContext);

function limiter(prefix: string, limit: number) {
  return rateLimit({
    windowMs: 60_000,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (...args: string[]) => redis.sendCommand(args),
      prefix,
    }),
    handler: (req: Request, res: Response) => {
      const requestId = (req as AuthenticatedRequest).requestId;
      res.status(429).json(errorResponse("RATE_LIMITED", "Too many requests", requestId));
    },
  });
}

let authLimit: RequestHandler | undefined;
let apiLimit: RequestHandler | undefined;

export function configureRateLimiters(): void {
  authLimit = limiter("rl:auth:", 5);
  apiLimit = limiter("rl:api:", 100);
}

function useLimiter(kind: "auth" | "api"): RequestHandler {
  return (req, res, next) => {
    const configured = kind === "auth" ? authLimit : apiLimit;
    if (!configured) {
      res.status(503).json(errorResponse("RATE_LIMITER_UNAVAILABLE", "Rate limiting is not ready", req.requestId));
      return;
    }
    configured(req, res, next);
  };
}

const authRateLimit = useLimiter("auth");
app.use("/api", useLimiter("api"));

const credentials = z.object({
  email: z.string().email().max(320),
  password: z.string().min(10).max(128),
});
const cartSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1).max(64),
    quantity: z.number().int().min(1).max(100),
  })).max(100),
});
const orderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1).max(64),
    quantity: z.number().int().min(1).max(100),
  })).min(1).max(100),
});

function routeParam(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

async function healthHandler(_req: Request, res: Response): Promise<void> {
  try {
    await redis.ping();
    res.json({ service: "api-gateway", status: "healthy", redis: "healthy" });
  } catch {
    res.status(503).json({ service: "api-gateway", status: "unhealthy", redis: "unhealthy" });
  }
}
app.get("/health", healthHandler);
app.get("/api/health", healthHandler);

app.post("/api/auth/register", authRateLimit, async (req, res, next) => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(errorResponse("INVALID_ARGUMENT", "Invalid credentials", req.requestId));
  try {
    return await forward(req, res, config.userServiceUrl, "/internal/users", {
      method: "POST", body: parsed.data,
    });
  } catch (error) { return next(error); }
});

app.post("/api/auth/login", authRateLimit, async (req, res, next) => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(errorResponse("INVALID_ARGUMENT", "Invalid credentials", req.requestId));
  try {
    return await forward(req, res, config.userServiceUrl, "/internal/login", {
      method: "POST", body: parsed.data,
    });
  } catch (error) { return next(error); }
});

app.get("/api/products", async (req, res) => {
  const query = new URLSearchParams();
  if (typeof req.query.q === "string") query.set("q", req.query.q.slice(0, 200));
  return forward(req as AuthenticatedRequest, res, config.productServiceUrl, `/internal/products?${query}`);
});
app.get("/api/products/search", async (req, res) => {
  const query = new URLSearchParams();
  if (typeof req.query.q === "string") query.set("q", req.query.q.slice(0, 200));
  return forward(req as AuthenticatedRequest, res, config.productServiceUrl, `/internal/products?${query}`);
});
app.get("/api/products/:id", (req, res) =>
  forward(req as AuthenticatedRequest, res, config.productServiceUrl, `/internal/products/${encodeURIComponent(routeParam(req, "id"))}`));
app.post("/api/products", authenticate, requireRole("ADMIN"), (req, res) =>
  forward(req as AuthenticatedRequest, res, config.productServiceUrl, "/internal/products", { method: "POST", body: req.body }));
app.patch("/api/products/:id", authenticate, requireRole("ADMIN"), (req, res) =>
  forward(req as AuthenticatedRequest, res, config.productServiceUrl, `/internal/products/${encodeURIComponent(routeParam(req, "id"))}`, { method: "PATCH", body: req.body }));
app.delete("/api/products/:id", authenticate, requireRole("ADMIN"), (req, res) =>
  forward(req as AuthenticatedRequest, res, config.productServiceUrl, `/internal/products/${encodeURIComponent(routeParam(req, "id"))}`, { method: "DELETE" }));

app.put("/api/cart", authenticate, async (req, res) => {
  const parsed = cartSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(errorResponse("INVALID_ARGUMENT", "Invalid cart", req.requestId));
  return forward(req as AuthenticatedRequest, res, config.orderServiceUrl, "/internal/cart", {
    method: "PUT",
    body: { items: parsed.data.items.map((item) => ({ product_id: item.productId, quantity: item.quantity })) },
    authenticated: true,
  });
});
app.post("/api/cart", authenticate, async (req, res) => {
  const parsed = cartSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(errorResponse("INVALID_ARGUMENT", "Invalid cart", req.requestId));
  return forward(req as AuthenticatedRequest, res, config.orderServiceUrl, "/internal/cart", {
    method: "PUT",
    body: { items: parsed.data.items.map((item) => ({ product_id: item.productId, quantity: item.quantity })) },
    authenticated: true,
  });
});
app.get("/api/cart", authenticate, (req, res) =>
  forward(req as AuthenticatedRequest, res, config.orderServiceUrl, "/internal/cart", { authenticated: true }));
app.post("/api/cart/items", authenticate, async (req, res) => {
  const parsed = z.object({ productId: z.string().min(1).max(64), quantity: z.number().int().min(1).max(100) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json(errorResponse("INVALID_ARGUMENT", "Invalid cart item", req.requestId));
  return forward(req as AuthenticatedRequest, res, config.orderServiceUrl, "/internal/cart/items", {
    method: "POST",
    body: { items: [{ product_id: parsed.data.productId, quantity: parsed.data.quantity }] },
    authenticated: true,
  });
});
app.delete("/api/cart/items/:productId", authenticate, (req, res) =>
  forward(req as AuthenticatedRequest, res, config.orderServiceUrl, `/internal/cart/items/${encodeURIComponent(routeParam(req, "productId"))}`, {
    method: "DELETE", authenticated: true,
  }));

app.post("/api/orders", authenticate, async (req, res) => {
  const parsed = orderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(errorResponse("INVALID_ARGUMENT", "At least one valid order item is required", req.requestId));
  return forward(req as AuthenticatedRequest, res, config.orderServiceUrl, "/internal/orders", {
    method: "POST",
    body: { items: parsed.data.items.map((item) => ({ product_id: item.productId, quantity: item.quantity })) },
    authenticated: true,
  });
});
app.get("/api/orders", authenticate, (req, res) =>
  forward(req as AuthenticatedRequest, res, config.orderServiceUrl, "/internal/orders", { authenticated: true }));
app.get("/api/orders/:id", authenticate, (req, res) =>
  forward(req as AuthenticatedRequest, res, config.orderServiceUrl, `/internal/orders/${encodeURIComponent(routeParam(req, "id"))}`, { authenticated: true }));
app.post("/api/orders/:id/cancel", authenticate, (req, res) =>
  forward(req as AuthenticatedRequest, res, config.orderServiceUrl, `/internal/orders/${encodeURIComponent(routeParam(req, "id"))}/cancel`, {
    method: "POST", authenticated: true,
  }));

app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
  console.error(JSON.stringify({
    service: "api-gateway", level: "ERROR",
    requestId: (req as AuthenticatedRequest).requestId,
    message: "Unhandled gateway error",
    error: error instanceof Error ? error.message : String(error),
  }));
  res.status(500).json(errorResponse("INTERNAL_ERROR", "An unexpected error occurred", (req as AuthenticatedRequest).requestId));
});
