'use client';

import { useSiteLanguage } from '@/components/site-language-provider';
import { DashboardWorkspaceShell } from '@/app/dashboard/dashboard-workspace-shell';
import { ErrorBoundary } from '@/components/error-boundary';
import { ServersClient } from './servers-client';

export default function ServersPage() {
	const { messages } = useSiteLanguage();

	return (
		<DashboardWorkspaceShell activeKey="servers" subtitle="Choose a server and jump into its live Lunio workspace." title={messages.servers.title}>
			<ErrorBoundary>
				<ServersClient />
			</ErrorBoundary>
		</DashboardWorkspaceShell>
	);
}
