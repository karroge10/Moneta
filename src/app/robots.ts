import { MetadataRoute } from 'next'

// Signed-in app routes redirect to /unauthorized for crawlers, so keep them out of the index.
const PRIVATE_PATHS = [
  '/api/',
  '/dashboard',
  '/income',
  '/expenses',
  '/transactions',
  '/investments',
  '/goals',
  '/statistics',
  '/financial-health',
  '/settings',
  '/notifications',
  '/help',
  '/pricing',
  '/updates',
  '/unauthorized',
  '/sign-in',
  '/sign-up',
];

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://monetafin.vercel.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
