import { SiteShell } from '@/components/site-shell';
import { DashboardClient } from '@/app/dashboard/dashboard-client';

export default async function GuildDashboardPage({ params }: { params: Promise<{ botId: string; guildId: string }> }) {
	const { botId, guildId } = await params;

	return (
		<SiteShell currentPath="/dashboard">
			<section className="py-8 sm:py-10">
				<div className="shell">
					<DashboardClient botIdFromQuery={botId} guildIdFromQuery={guildId} />
				</div>
			</section>
		</SiteShell>
	);
}
