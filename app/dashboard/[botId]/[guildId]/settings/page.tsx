import { DashboardSettingsClient } from '@/app/dashboard/settings/settings-client';
import { DashboardWorkspaceShell } from '@/app/dashboard/dashboard-workspace-shell';

export default async function GuildDashboardSettingsPage({ params }: { params: Promise<{ botId: string; guildId: string }> }) {
	const { botId, guildId } = await params;

	return (
		<DashboardWorkspaceShell activeKey="guild-settings" botId={botId} guildId={guildId} subtitle="Configure how Lunio behaves in this server." title="Server Settings">
			<DashboardSettingsClient botIdFromQuery={botId} guildIdFromQuery={guildId} />
		</DashboardWorkspaceShell>
	);
}
