import { SiteShell } from "@/components/site-shell";
import { DashboardRouteState } from "@/components/dashboard-route-state";

export default function NotFound() {
  return (
    <SiteShell currentPath="">
      <DashboardRouteState
        title="Page not found"
        message="That page does not exist anymore, or the link is no longer valid."
        primaryHref="/"
        primaryLabel="Return home"
      />
    </SiteShell>
  );
}
