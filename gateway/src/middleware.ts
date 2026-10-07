import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { config } from "./config";
import { AuthenticatedRequest, AuthUser } from "./types";

export function requestContext(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const candidate = req.header("x-request-id");
  req.requestId = candidate && /^[A-Za-z0-9._-]{1,100}$/.test(candidate)
    ? candidate
    : `req_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
  res.setHeader("x-request-id", req.requestId);
  next();
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authorization = req.header("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json(errorResponse("UNAUTHENTICATED", "Authentication is required", req.requestId));
    return;
  }
  if (!config.jwtSecret || config.jwtSecret.length < 32) {
    res.status(503).json(errorResponse("AUTH_UNAVAILABLE", "Authentication is not configured", req.requestId));
    return;
  }
  try {
    const payload = jwt.verify(authorization.slice(7), config.jwtSecret, { algorithms: ["HS256"] });
    if (typeof payload === "string" || typeof payload.sub !== "string") throw new Error("Invalid token payload");
    const role = payload.role === "ADMIN" ? "ADMIN" : "CUSTOMER";
    req.user = { id: payload.sub, role } satisfies AuthUser;
    next();
  } catch {
    res.status(401).json(errorResponse("UNAUTHENTICATED", "Invalid or expired access token", req.requestId));
  }
}

export function requireRole(...roles: AuthUser["role"][]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json(errorResponse("PERMISSION_DENIED", "Insufficient permissions", req.requestId));
      return;
    }
    next();
  };
}

export function errorResponse(code: string, message: string, requestId = "") {
  return { success: false, error: { code, message, requestId } };
}

