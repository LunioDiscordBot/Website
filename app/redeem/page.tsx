'use client';

import { useSearchParams } from 'next/navigation';
import { SiteShell } from '@/components/site-shell';
import { RedeemClient } from './redeem-client';

export default function RedeemPage() {
	const searchParams = useSearchParams();
	const botId = (searchParams.get('botId') || 'lunio').trim().toLowerCase();

	return (
		<SiteShell currentPath="/redeem">
			<section className="py-16 sm:py-24">
				<div className="shell">
					<RedeemClient botId={botId} />
				</div>
			</section>
		</SiteShell>
	);
}
