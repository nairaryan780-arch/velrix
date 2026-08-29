import { prisma } from "./db";
import { HttpError, notFound } from "./http";
import { UsageLimitError } from "./billing/usage";
import { log } from "./logger";

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export function corsJson(data: unknown, status = 200) {
  return Response.json(data, { status, headers: CORS_HEADERS });
}

export function corsPreflight() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/** Maps an error to a CORS JSON response with the correct status code. */
export function corsError(err: unknown, context: string) {
  if (err instanceof HttpError) return corsJson({ error: { code: err.code, message: err.message } }, err.status);
  if (err instanceof UsageLimitError) return corsJson({ error: { code: "plan_limit", message: "This workspace has reached its plan limit." } }, 402);
  log.error(`${context}_failed`, { error: err instanceof Error ? err.message : "unknown" });
  return corsJson({ error: { code: "internal_error", message: "Something went wrong" } }, 500);
}

/** Resolves the org + channel for a public widget key (untrusted input). */
export async function resolveWidgetChannel(publicKey: string) {
  const channel = await prisma.channel.findUnique({
    where: { publicKey },
    include: { organization: true },
  });
  if (!channel) throw notFound("Unknown widget key");
  return { channel, org: channel.organization };
}
