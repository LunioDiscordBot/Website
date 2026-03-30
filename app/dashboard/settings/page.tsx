import { SiteShell } from "@/components/site-shell";
import { DashboardSettingsClient } from "@/app/dashboard/settings/settings-client";
import { redirect } from "next/navigation";
import { buildDashboardPath } from "@/lib/dashboard-routes";

export default async function DashboardSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ guildId?: string; botId?: string }>;
}) {
  const params = await searchParams;
  if (params.botId && params.guildId) {
    redirect(buildDashboardPath(params.botId, params.guildId, "settings"));
  }

  return (
    <SiteShell currentPath="/dashboard">
      <section className="py-12 sm:py-16">
        <div className="shell">
          <DashboardSettingsClient />
        </div>
      </section>
    </SiteShell>
  );
}
