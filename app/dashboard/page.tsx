import { SiteShell } from '@/components/site-shell';
import { DashboardClient } from './dashboard-client';
import { redirect } from 'next/navigation';
import { buildDashboardPath } from '@/lib/dashboard-routes';

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ guildId?: string; botId?: string }> }) {
	const params = await searchParams;
	if (params.botId && params.guildId) {
		redirect(buildDashboardPath(params.botId, params.guildId));
	}

	return (
		<SiteShell currentPath="/dashboard">
			<section className="py-8 sm:py-10">
				<div className="shell">
					<DashboardClient />
				</div>
			</section>
		</SiteShell>
	);
}
