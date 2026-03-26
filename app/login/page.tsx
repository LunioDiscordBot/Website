import Link from "next/link";
import { SiteShell } from "@/components/site-shell";

export default function LoginPage() {
  return (
    <SiteShell currentPath="/login">
      <section className="py-16 sm:py-24">
        <div className="shell">
          <div className="mx-auto max-w-3xl panel p-8 sm:p-10">
            <div className="eyebrow">Access</div>
            <h1 className="section-title">Sign in with Discord</h1>
            <p className="section-copy mt-5">
              Connect your Discord account to access your servers, settings, and music controls.
            </p>

            <div className="mt-8 rounded-[1.5rem] border border-tertiary/30 bg-tertiary/10 p-5 text-sm leading-7 text-violet-100">
              Server access and dashboard controls are available through your connected guilds.
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link className="primary-button" href="/servers">
                Open Servers
              </Link>
              <Link className="ghost-button" href="/dashboard">
                Open Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
