import { Response } from "express";
import { AuthenticatedRequest } from "./types";
import { errorResponse } from "./middleware";
import { config } from "./config";

export async function forward(
  req: AuthenticatedRequest,
  res: Response,
  baseUrl: string,
  path: string,
  options: { method?: string; body?: unknown; authenticated?: boolean } = {},
): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.downstreamTimeoutMs);
  try {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-request-id": req.requestId ?? "",
    };
    if (options.authenticated && req.user) {
      headers["x-user-id"] = req.user.id;
      headers["x-user-role"] = req.user.role;
    }
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : { detail: await response.text() };
    if (!response.ok) {
      const detail = typeof payload.detail === "string" ? payload.detail : "Request could not be completed";
      res.status(response.status).json(errorResponse(
        response.status === 404 ? "NOT_FOUND" :
          response.status === 401 ? "UNAUTHENTICATED" :
            response.status === 403 ? "PERMISSION_DENIED" :
              response.status === 409 ? "CONFLICT" : "DOWNSTREAM_ERROR",
        detail,
        req.requestId,
      ));
      return;
    }
    res.status(response.status).json(payload);
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    console.error(JSON.stringify({
      service: "api-gateway",
      level: "ERROR",
      requestId: req.requestId,
      message: timedOut ? "Downstream request timed out" : "Downstream request failed",
      error: error instanceof Error ? error.message : String(error),
    }));
    res.status(timedOut ? 504 : 503).json(errorResponse(
      timedOut ? "DEADLINE_EXCEEDED" : "SERVICE_UNAVAILABLE",
      timedOut ? "A downstream service timed out" : "A downstream service is unavailable",
      req.requestId,
    ));
  } finally {
    clearTimeout(timer);
  }
}
