import { DashboardWorkspaceShell } from '@/app/dashboard/dashboard-workspace-shell';
import { SiteSettingsClient } from '@/app/settings/settings-client';

export default function SettingsPage() {
	return (
		<DashboardWorkspaceShell activeKey="account-settings" subtitle="Appearance, language, and local dashboard preferences." title="Account settings">
			<SiteSettingsClient />
		</DashboardWorkspaceShell>
	);
}
