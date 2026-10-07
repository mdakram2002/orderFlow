import { Request } from "express";

export type AuthUser = { id: string; role: "CUSTOMER" | "ADMIN" };
export type AuthenticatedRequest = Request & { user?: AuthUser; requestId?: string };

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      requestId?: string;
    }
  }
}
