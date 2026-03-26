import { SiteShell } from "@/components/site-shell";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ guildId?: string }>;
}) {
  const params = await searchParams;

  return (
    <SiteShell currentPath="/dashboard">
      <section className="py-16 sm:py-24">
        <div className="shell">
          <div className="eyebrow">Dashboard</div>
          <h1 className="section-title">Control every session from one place</h1>
          <p className="section-copy mt-5">
            Manage playback, monitor queue state, and keep sessions moving with fast browser-based
            controls.
          </p>

          <div className="mt-12">
            <DashboardClient guildIdFromQuery={params.guildId} />
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
