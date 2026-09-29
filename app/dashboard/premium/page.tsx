import { DashboardWorkspaceShell } from '@/app/dashboard/dashboard-workspace-shell';
import Link from 'next/link';

export default function PremiumPickerPage() {
	return (
		<DashboardWorkspaceShell activeKey="premium" subtitle="Pick a server first so Lunio knows where premium should be attached." title="Manage premium">
			<div className="dashboard-panel-card">
				<div className="metric-label">Server required</div>
				<h2 className="mt-3 font-headline text-4xl font-bold tracking-[-0.06em] text-white">Choose a server to manage premium.</h2>
				<p className="mt-4 max-w-2xl text-sm leading-7 text-muted">Premium is server-scoped, so checkout and billing controls open after you select a connected guild.</p>
				<Link className="primary-button mt-6 inline-flex" href="/servers">
					Open servers
				</Link>
			</div>
		</DashboardWorkspaceShell>
	);
}
