import { route, parseJson, ok, created, badRequest, notFound } from "@/lib/http";
import { requireOrg } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { knowledgeCreateSchema } from "@/lib/validation";
import { ingestSource } from "@/lib/knowledge";
import { assertUsage } from "@/lib/billing/usage";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export const POST = route(async (req) => {
  const ctx = await requireOrg("knowledge:write");
  await assertUsage(ctx.org.id, "knowledgeSources");
  const body = await parseJson(req, knowledgeCreateSchema);

  if (body.type === "URL" && !body.url) throw badRequest("A URL is required for URL sources");
  if (body.type !== "URL" && !body.content?.trim()) throw badRequest("Content is required");

  const source = await prisma.knowledgeSource.create({
    data: {
      organizationId: ctx.org.id,
      type: body.type,
      title: body.title,
      content: body.content ?? "",
      url: body.url,
      status: "PENDING",
      approved: true,
    },
  });

  // Index synchronously (fast for text; URL fetch is bounded). For large corpora
  // this would move to a background worker.
  await ingestSource(source.id);
  await audit({ action: "knowledge.create", organizationId: ctx.org.id, userId: ctx.user.id, entity: "knowledge", entityId: source.id });

  const fresh = await prisma.knowledgeSource.findUnique({ where: { id: source.id } });
  return created({ id: source.id, status: fresh?.status, errorMessage: fresh?.errorMessage });
});

export const DELETE = route(async (req) => {
  const ctx = await requireOrg("knowledge:write");
  const id = new URL(req.url).searchParams.get("id");
  if (!id) throw badRequest("Missing id");
  const source = await prisma.knowledgeSource.findFirst({ where: { id, organizationId: ctx.org.id } });
  if (!source) throw notFound("Knowledge source not found");
  await prisma.knowledgeSource.delete({ where: { id } });
  await audit({ action: "knowledge.delete", organizationId: ctx.org.id, userId: ctx.user.id, entity: "knowledge", entityId: id });
  return ok({ ok: true });
});

// Reindex an existing source.
export const PATCH = route(async (req) => {
  const ctx = await requireOrg("knowledge:write");
  const id = new URL(req.url).searchParams.get("id");
  if (!id) throw badRequest("Missing id");
  const source = await prisma.knowledgeSource.findFirst({ where: { id, organizationId: ctx.org.id } });
  if (!source) throw notFound("Knowledge source not found");
  await ingestSource(id);
  const fresh = await prisma.knowledgeSource.findUnique({ where: { id } });
  return ok({ ok: true, status: fresh?.status });
});
