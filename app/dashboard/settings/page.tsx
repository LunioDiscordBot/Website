import { DashboardSettingsClient } from '@/app/dashboard/settings/settings-client';
import { DashboardWorkspaceShell } from '@/app/dashboard/dashboard-workspace-shell';
import { redirect } from 'next/navigation';
import { buildDashboardPath } from '@/lib/dashboard-routes';

export default async function DashboardSettingsPage({ searchParams }: { searchParams: Promise<{ guildId?: string; botId?: string }> }) {
	const params = await searchParams;
	if (params.botId && params.guildId) {
		redirect(buildDashboardPath(params.botId, params.guildId, 'settings'));
	}

	return (
		<DashboardWorkspaceShell activeKey="guild-settings" subtitle="Tune Lunio for the selected server once a guild has been chosen." title="Guild settings">
			<DashboardSettingsClient />
		</DashboardWorkspaceShell>
	);
}
