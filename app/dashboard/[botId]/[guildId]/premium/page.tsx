import { DashboardPremiumClient } from '@/app/dashboard/premium/premium-client';
import { DashboardWorkspaceShell } from '@/app/dashboard/dashboard-workspace-shell';

export default async function GuildPremiumPage({ params }: { params: Promise<{ botId: string; guildId: string }> }) {
	const { botId, guildId } = await params;

	return (
		<DashboardWorkspaceShell activeKey="premium" botId={botId} guildId={guildId} subtitle="Plans, billing, and Premium transfers for this server." title="Premium">
			<DashboardPremiumClient botId={botId} guildId={guildId} />
		</DashboardWorkspaceShell>
	);
}
