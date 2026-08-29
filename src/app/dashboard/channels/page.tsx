import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { PageHeader, EmptyState } from "@/components/dashboard/ui";
import { ChannelsPanel } from "@/components/dashboard/channels-panel";

export const dynamic = "force-dynamic";

export default async function ChannelsPage() {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");

  const [website, integrations] = await Promise.all([
    prisma.channel.findFirst({ where: { organizationId: ctx.org.id, type: "WEBSITE" } }),
    prisma.integration.findMany({ where: { organizationId: ctx.org.id } }),
  ]);

  return (
    <div>
      <PageHeader title="Channels" subtitle="Connect the places your enquiries come from." />
      {website ? (
        <ChannelsPanel
          publicKey={website.publicKey}
          appUrl={env.appUrl}
          integrations={integrations.map((i) => ({ provider: i.provider, status: i.status, lastError: i.lastError }))}
        />
      ) : (
        <EmptyState title="No website channel" body="Your workspace is missing its website channel. Re-run onboarding to create one." />
      )}
    </div>
  );
}
