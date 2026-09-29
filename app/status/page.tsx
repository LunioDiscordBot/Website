import { SiteShell } from '@/components/site-shell';
import { StatusClient } from './status-client';

export default function StatusPage() {
	return (
		<SiteShell currentPath="/status">
			<section className="shell pt-14 sm:pt-20">
				<StatusClient />
			</section>
		</SiteShell>
	);
}
