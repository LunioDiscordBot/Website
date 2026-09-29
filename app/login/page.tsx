'use client';

import { SiteShell } from '@/components/site-shell';
import { LoginClient } from './login-client';

export default function LoginPage() {
	return (
		<SiteShell currentPath="/login">
			<section className="shell pt-14 sm:pt-20">
				<LoginClient />
			</section>
		</SiteShell>
	);
}
