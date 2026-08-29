import { route, parseJson, ok } from "@/lib/http";
import { requireOrg } from "@/lib/auth/context";
import { conversationActionSchema } from "@/lib/validation";
import {
  takeoverConversation,
  releaseConversation,
  closeConversation,
  assignConversation,
  humanMessage,
} from "@/lib/conversations";

export const runtime = "nodejs";

export const POST = route(async (req, rc) => {
  const ctx = await requireOrg("conversations:takeover");
  const { id } = (await rc.params) ?? {};
  const body = await parseJson(req, conversationActionSchema);
  if (!id) throw new Error("missing id");

  switch (body.action) {
    case "takeover":
      return ok(await takeoverConversation(ctx.org.id, id, ctx.user.id));
    case "release":
      return ok(await releaseConversation(ctx.org.id, id, ctx.user.id));
    case "close":
      return ok(await closeConversation(ctx.org.id, id, ctx.user.id));
    case "assign":
      return ok(await assignConversation(ctx.org.id, id, body.assignedToId, ctx.user.id));
    case "human_message":
      return ok(await humanMessage(ctx.org.id, id, body.body, ctx.user.id));
  }
});
