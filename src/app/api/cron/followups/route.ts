import { env } from "@/lib/env";
import { runDueFollowUps } from "@/lib/followups";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Processes due follow-up jobs and sweeps dormant conversations. Call on a
 * schedule (e.g. every 5 minutes) from your platform's cron / a worker.
 * Protected by CRON_SECRET via Authorization: Bearer or ?secret=.
 */
async function handle(req: Request) {
  const url = new URL(req.url);
  const provided = req.headers.get("authorization")?.replace("Bearer ", "") ?? url.searchParams.get("secret");
  if (provided !== env.cronSecret) {
    return Response.json({ error: { code: "unauthorized", message: "Invalid cron secret" } }, { status: 401 });
  }
  const result = await runDueFollowUps();
  log.info("cron.followups", result);
  return Response.json({ ok: true, ...result });
}

export const GET = handle;
export const POST = handle;
