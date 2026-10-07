import express, { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { config } from "./config";
import { redis, productCacheKey } from "./cache";
import { Product } from "./models/product";

const productInput = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(5000).default(""),
  category: z.string().trim().min(1).max(100),
  priceMinor: z.number().int().nonnegative(),
  currency: z.string().length(3).default("INR"),
  stock: z.number().int().nonnegative(),
  attributes: z.record(z.string(), z.unknown()).default({}),
});

export const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/health", async (_req, res) => {
  try {
    await Promise.all([Product.findOne().select("_id").lean(), redis.ping()]);
    res.json({ service: "product-service", status: "healthy", database: "healthy", redis: "healthy" });
  } catch {
    res.status(503).json({ service: "product-service", status: "unhealthy" });
  }
});

app.get("/internal/products", async (req, res, next) => {
  try {
    const query = String(req.query.q ?? "").trim();
    const filter = query ? { $text: { $search: query } } : {};
    const items = await Product.find(filter).select("-reservations").limit(100).lean();
    res.json(items.map((item) => ({ ...item, id: item._id.toString(), _id: undefined })));
  } catch (error) {
    next(error);
  }
});

app.get("/internal/categories", async (_req, res, next) => {
  try {
    const categories = await Product.distinct("category");
    res.json(categories.sort());
  } catch (error) {
    next(error);
  }
});

app.get("/internal/products/:id", async (req, res, next) => {
  try {
    const key = productCacheKey(req.params.id);
    const cached = await redis.get(key);
    if (cached) return res.json(JSON.parse(cached));
    const item = await Product.findById(req.params.id).select("-reservations").lean();
    if (!item) return res.status(404).json({ detail: "Product was not found" });
    const result = { ...item, id: item._id.toString(), _id: undefined };
    await redis.set(key, JSON.stringify(result), { EX: config.cacheTtlSeconds });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

app.post("/internal/products", async (req, res, next) => {
  try {
    const input = productInput.parse(req.body);
    const item = await Product.create(input);
    res.status(201).json({ ...item.toObject(), id: item.id, _id: undefined, reservations: undefined });
  } catch (error) {
    next(error);
  }
});

app.patch("/internal/products/:id", async (req, res, next) => {
  try {
    const input = productInput.partial().parse(req.body);
    const item = await Product.findByIdAndUpdate(req.params.id, input, { new: true, runValidators: true })
      .select("-reservations");
    if (!item) return res.status(404).json({ detail: "Product was not found" });
    await redis.del(productCacheKey(req.params.id));
    return res.json({ ...item.toObject(), id: item.id, _id: undefined });
  } catch (error) {
    return next(error);
  }
});

app.delete("/internal/products/:id", async (req, res, next) => {
  try {
    const item = await Product.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ detail: "Product was not found" });
    await redis.del(productCacheKey(req.params.id));
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ detail: "Invalid product", errors: error.issues });
  }
  console.error(JSON.stringify({ service: "product-service", level: "ERROR", message: "Request failed", error }));
  return res.status(500).json({ detail: "Internal service error" });
});
