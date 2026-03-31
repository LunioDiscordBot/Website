import { cookies } from 'next/headers';
import { getSiteMessages, isSiteLanguage, SITE_LANGUAGE_COOKIE_KEY, type SiteLanguage } from '@/lib/site-language';

export async function getServerSiteLanguage(): Promise<SiteLanguage> {
	const cookieStore = await cookies();
	const cookieLanguage = cookieStore.get(SITE_LANGUAGE_COOKIE_KEY)?.value;
	return isSiteLanguage(cookieLanguage) ? cookieLanguage : 'en';
}

export async function getServerSiteMessages() {
	return getSiteMessages(await getServerSiteLanguage());
}
