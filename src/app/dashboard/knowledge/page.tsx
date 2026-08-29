import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/ui";
import { KnowledgePanel } from "@/components/dashboard/knowledge-panel";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");

  const sources = await prisma.knowledgeSource.findMany({
    where: { organizationId: ctx.org.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { chunks: true } } },
  });

  return (
    <div>
      <PageHeader title="Knowledge" subtitle="What your agent knows. Everything here is retrieved as approved facts — never invented." />
      <KnowledgePanel
        sources={sources.map((s) => ({
          id: s.id,
          type: s.type,
          title: s.title,
          status: s.status,
          errorMessage: s.errorMessage,
          lastIndexedAt: s.lastIndexedAt?.toISOString() ?? null,
          chunks: s._count.chunks,
        }))}
      />
    </div>
  );
}
