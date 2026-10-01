import { MetadataRoute } from 'next'

// Only public pages; everything under the signed-in app is excluded (see robots.ts).
const PUBLIC_ROUTES = ['', '/terms', '/privacy'];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://monetafin.vercel.app';

  return PUBLIC_ROUTES.map((route) => ({
    url: `${siteUrl}${route}`,
    changeFrequency: 'monthly' as const,
    priority: route === '' ? 1 : 0.5,
  }))
}
