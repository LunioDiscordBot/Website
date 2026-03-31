import { DashboardClient } from '@/app/dashboard/dashboard-client';

export default async function GuildDashboardPage({ params }: { params: Promise<{ botId: string; guildId: string }> }) {
	const { botId, guildId } = await params;

	return <DashboardClient botIdFromQuery={botId} guildIdFromQuery={guildId} />;
}
