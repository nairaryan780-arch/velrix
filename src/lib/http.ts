import { randomUUID } from "crypto";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { log, withLogContext } from "./logger";
import { UsageLimitError } from "./billing/usage";

export type ApiError = { error: { code: string; message: string; details?: unknown } };

export function ok<T>(data: T, init?: ResponseInit) {
  return Response.json(data, init);
}

export function created<T>(data: T) {
  return Response.json(data, { status: 201 });
}

export function fail(code: string, message: string, status = 400, details?: unknown) {
  return Response.json({ error: { code, message, details } } satisfies ApiError, { status });
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (m: string, d?: unknown) => new HttpError(400, "bad_request", m, d);
export const unauthorized = (m = "Not authenticated") => new HttpError(401, "unauthorized", m);
export const forbidden = (m = "Forbidden") => new HttpError(403, "forbidden", m);
export const notFound = (m = "Not found") => new HttpError(404, "not_found", m);
export const conflict = (m: string) => new HttpError(409, "conflict", m);
export const tooMany = (m = "Rate limit exceeded") => new HttpError(429, "rate_limited", m);

type NextRouteContext = { params?: Promise<Record<string, string>> };
type RouteCtx = { requestId: string; params?: Promise<Record<string, string>> };

/**
 * Wraps a route handler with request-id logging and consistent error mapping so
 * every API route returns the same error envelope and never leaks stack traces.
 * Forwards Next's dynamic `params` promise to the handler.
 */
export function route(handler: (req: Request, ctx: RouteCtx) => Promise<Response>) {
  return async (req: Request, nextCtx?: NextRouteContext): Promise<Response> => {
    const requestId = req.headers.get("x-request-id") ?? randomUUID();
    return withLogContext({ requestId }, async () => {
      const started = Date.now();
      try {
        const res = await handler(req, { requestId, params: nextCtx?.params });
        res.headers.set("x-request-id", requestId);
        log.info("http.request", {
          method: req.method,
          path: new URL(req.url).pathname,
          status: res.status,
          ms: Date.now() - started,
        });
        return res;
      } catch (err) {
        return mapError(err, requestId, req, started);
      }
    });
  };
}

function mapError(err: unknown, requestId: string, req: Request, started: number): Response {
  let status = 500;
  let code = "internal_error";
  let message = "Something went wrong";
  let details: unknown;

  if (err instanceof HttpError) {
    status = err.status;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    status = 400;
    code = "validation_error";
    message = "Invalid request";
    details = err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
  } else if (err instanceof UsageLimitError) {
    status = 402;
    code = "plan_limit";
    message = err.message;
    details = { metric: err.metric };
  } else if (err && typeof err === "object" && "status" in err && typeof (err as { status: unknown }).status === "number") {
    status = (err as { status: number }).status;
    message = err instanceof Error ? err.message : message;
    code = status === 403 ? "forbidden" : status === 401 ? "unauthorized" : code;
  }

  const level = status >= 500 ? "error" : "warn";
  log[level]("http.error", {
    method: req.method,
    path: new URL(req.url).pathname,
    status,
    code,
    ms: Date.now() - started,
    error: err instanceof Error ? err.message : String(err),
  });

  const res = Response.json({ error: { code, message, details } } satisfies ApiError, { status });
  res.headers.set("x-request-id", requestId);
  return res;
}

export async function parseJson<S extends ZodTypeAny>(req: Request, schema: S): Promise<z.infer<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw badRequest("Request body must be valid JSON");
  }
  return schema.parse(body);
}
