import { SiteShell } from '@/components/site-shell';
import { StatusClient } from './status-client';

export default function StatusPage() {
	return (
		<SiteShell currentPath="/status">
			<section className="py-10 sm:py-12">
				<div className="shell">
					<div className="mt-2">
						<StatusClient />
					</div>
				</div>
			</section>
		</SiteShell>
	);
}
