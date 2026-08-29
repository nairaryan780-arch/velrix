import { z } from "zod";
import { route, parseJson, ok } from "@/lib/http";
import { requireOrg } from "@/lib/auth/context";
import { simulateAgent } from "@/lib/agent/simulate";

export const runtime = "nodejs";

const schema = z.object({
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) }))
    .min(1)
    .max(40),
});

export const POST = route(async (req) => {
  const ctx = await requireOrg("agent:write");
  const { history } = await parseJson(req, schema);
  const result = await simulateAgent(ctx.org.id, history);
  return ok(result);
});
