import { SiteShell } from "@/components/site-shell";
import { SiteSettingsClient } from "@/app/settings/settings-client";

export default function SettingsPage() {
  return (
    <SiteShell currentPath="/settings">
      <section className="py-12 sm:py-16">
        <div className="shell">
          <SiteSettingsClient />
        </div>
      </section>
    </SiteShell>
  );
}
