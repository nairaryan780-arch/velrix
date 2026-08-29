import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/auth/context";
import { PageHeader } from "@/components/dashboard/ui";
import { SettingsPanel } from "@/components/dashboard/settings-panel";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your workspace and data." />
      <SettingsPanel
        org={{
          name: ctx.org.name,
          industry: ctx.org.industry,
          website: ctx.org.website ?? "",
          whatWeSell: ctx.org.whatWeSell ?? "",
          timezone: ctx.org.timezone,
          slug: ctx.org.slug,
        }}
        isOwner={ctx.role === "OWNER"}
      />
    </div>
  );
}
