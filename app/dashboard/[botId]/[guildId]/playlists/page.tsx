import { DashboardPlaylistClient } from '@/app/dashboard/playlists/playlist-client';
import { DashboardWorkspaceShell } from '@/app/dashboard/dashboard-workspace-shell';

export default async function GuildDashboardPlaylistsPage({ params }: { params: Promise<{ botId: string; guildId: string }> }) {
	const { botId, guildId } = await params;

	return (
		<DashboardWorkspaceShell
			activeKey="playlists"
			botId={botId}
			guildId={guildId}
			subtitle="Manage saved queues, load them into the live player, and keep your default playlist tidy."
			title="Playlists"
		>
			<DashboardPlaylistClient botIdFromQuery={botId} guildIdFromQuery={guildId} />
		</DashboardWorkspaceShell>
	);
}
