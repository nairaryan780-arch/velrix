import { corsJson, corsPreflight, corsError, resolveWidgetChannel } from "@/lib/widget";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export function OPTIONS() {
  return corsPreflight();
}

export async function GET(req: Request) {
  try {
    const publicKey = new URL(req.url).searchParams.get("publicKey") ?? "";
    if (!publicKey) return corsJson({ error: { code: "bad_request", message: "Missing publicKey" } }, 400);

    const { org } = await resolveWidgetChannel(publicKey);
    const agent = await prisma.agent.findFirst({ where: { organizationId: org.id } });
    const w = (agent?.widgetJson as Record<string, unknown> | null) ?? {};

    return corsJson({
      agentName: (w.agentName as string) ?? agent?.name ?? "Velrix",
      businessName: (w.businessName as string) ?? org.name,
      accent: (w.accent as string) ?? "#0891b2",
      position: (w.position as string) ?? "right",
      welcomeMessage: (w.welcomeMessage as string) ?? "Hi! How can I help you today?",
      showBranding: w.showBranding !== false,
    });
  } catch (err) {
    return corsError(err, "widget.config");
  }
}
