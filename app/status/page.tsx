import { SiteShell } from "@/components/site-shell";
import { StatusClient } from "./status-client";

export default function StatusPage() {
  return (
    <SiteShell currentPath="/status">
      <section className="py-16 sm:py-24">
        <div className="shell">
          <div className="eyebrow">System Status</div>
          <h1 className="section-title">Live visibility across the Lunio network</h1>
          <p className="section-copy mt-5">
            Track node health, shard activity, player load, and latency from a single status view.
          </p>

          <div className="mt-12">
            <StatusClient />
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
