"use client";

import { useSiteLanguage } from "@/components/site-language-provider";
import { SiteShell } from "@/components/site-shell";
import { ServersClient } from "./servers-client";

export default function ServersPage() {
  const { messages } = useSiteLanguage();

  return (
    <SiteShell currentPath="/servers">
      <section className="py-16 sm:py-24">
        <div className="shell">
          <div className="eyebrow">{messages.servers.eyebrow}</div>
          <h1 className="section-title">{messages.servers.title}</h1>
          <div className="mt-10">
            <ServersClient />
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
