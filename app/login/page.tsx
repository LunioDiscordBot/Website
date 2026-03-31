'use client';

import { SiteShell } from '@/components/site-shell';
import { LoginClient } from './login-client';

export default function LoginPage() {
	return (
		<SiteShell currentPath="/login">
			<section className="py-16 sm:py-24">
				<div className="shell">
					<LoginClient />
				</div>
			</section>
		</SiteShell>
	);
}
