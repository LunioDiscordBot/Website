import type { MetadataRoute } from 'next';
import { DASHBOARD_PATH_PREFIXES, getPublicBaseUrl } from '@/lib/site-url';

export default function robots(): MetadataRoute.Robots {
	const baseUrl = getPublicBaseUrl();
	return {
		rules: {
			userAgent: '*',
			allow: '/',
			// Signed-in pages and the code redemption flow have nothing to index.
			disallow: [...DASHBOARD_PATH_PREFIXES, '/redeem'],
		},
		sitemap: `${baseUrl}/sitemap.xml`,
		host: baseUrl,
	};
}
