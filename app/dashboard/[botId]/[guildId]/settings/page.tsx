import { SiteShell } from '@/components/site-shell';
import { DashboardSettingsClient } from '@/app/dashboard/settings/settings-client';

export default async function GuildDashboardSettingsPage({ params }: { params: Promise<{ botId: string; guildId: string }> }) {
	const { botId, guildId } = await params;

	return (
		<SiteShell currentPath="/dashboard">
			<section className="py-12 sm:py-16">
				<div className="shell">
					<DashboardSettingsClient botIdFromQuery={botId} guildIdFromQuery={guildId} />
				</div>
			</section>
		</SiteShell>
	);
}
