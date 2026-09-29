'use client';

import { useSearchParams } from 'next/navigation';
import { SiteShell } from '@/components/site-shell';
import { RedeemClient } from './redeem-client';

export default function RedeemPage() {
	const searchParams = useSearchParams();
	const botId = (searchParams.get('botId') || 'lunio').trim().toLowerCase();

	return (
		<SiteShell currentPath="/redeem">
			<section className="shell pt-14 sm:pt-20">
				<RedeemClient botId={botId} />
			</section>
		</SiteShell>
	);
}
