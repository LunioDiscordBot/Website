import { DashboardPlaylistClient } from '@/app/dashboard/playlists/playlist-client';
import { DashboardWorkspaceShell } from '@/app/dashboard/dashboard-workspace-shell';
import { redirect } from 'next/navigation';
import { buildDashboardPath } from '@/lib/dashboard-routes';

export default async function DashboardPlaylistsPage({ searchParams }: { searchParams: Promise<{ guildId?: string; botId?: string }> }) {
	const params = await searchParams;
	if (params.botId && params.guildId) {
		redirect(buildDashboardPath(params.botId, params.guildId, 'playlists'));
	}

	return (
		<DashboardWorkspaceShell activeKey="playlists" subtitle="Pick a server first, then manage your saved Lunio playlists." title="Playlists">
			<DashboardPlaylistClient />
		</DashboardWorkspaceShell>
	);
}
