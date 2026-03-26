import { SiteShell } from "@/components/site-shell";
import { ServersClient } from "./servers-client";

export default function ServersPage() {
  return (
    <SiteShell currentPath="/servers">
      <section className="py-16 sm:py-24">
        <div className="shell">
          <div className="eyebrow">Server Picker</div>
          <h1 className="section-title">Choose a Lunio-enabled guild</h1>
          <div className="mt-10">
            <ServersClient />
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
