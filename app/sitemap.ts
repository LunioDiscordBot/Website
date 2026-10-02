import type { MetadataRoute } from 'next';
import { getPublicBaseUrl, PUBLIC_PAGE_PATHS } from '@/lib/site-url';

const PAGE_SETTINGS: Record<(typeof PUBLIC_PAGE_PATHS)[number], Pick<MetadataRoute.Sitemap[number], 'changeFrequency' | 'priority'>> = {
	'/': { changeFrequency: 'weekly', priority: 1 },
	'/commands': { changeFrequency: 'weekly', priority: 0.8 },
	'/status': { changeFrequency: 'daily', priority: 0.5 },
	'/tos': { changeFrequency: 'yearly', priority: 0.3 },
	'/privacy': { changeFrequency: 'yearly', priority: 0.3 },
	'/withdrawal': { changeFrequency: 'yearly', priority: 0.2 },
};

export default function sitemap(): MetadataRoute.Sitemap {
	const baseUrl = getPublicBaseUrl();
	return PUBLIC_PAGE_PATHS.map((path) => ({
		url: path === '/' ? baseUrl : `${baseUrl}${path}`,
		...PAGE_SETTINGS[path],
	}));
}
