import { publicLocales } from '@/i18n/config';
import { MetadataRoute } from 'next';
import { headers } from 'next/headers';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headersList = await headers();
  const domain = headersList.get('host') || '';
  const localizedRootAllowRules = publicLocales.flatMap((locale) => [
    `/${locale}$`,
    `/${locale}/$`,
  ]);

  // `$` anchors the rule so a document whose slug merely starts with `null` stays crawlable.
  // The rule is longer than `/<locale>/cybersecurity-solutions/*`, so it wins over that allow rule.
  const nullDocumentSlugDisallowRules = publicLocales.map(
    (locale) => `/${locale}/cybersecurity-solutions/*/null$`
  );

  const isProductionDomain = domain === 'hub.filigran.io';

  if (isProductionDomain) {
    return {
      rules: [
        {
          userAgent: '*',
          disallow: ['/', ...nullDocumentSlugDisallowRules],
          allow: [
            '/sitemap.xml',
            '/login',
            '/favicon.ico',
            '/apple-icon.png',
            '/favicon-*.png',
            '/_next/static/',
            '/_next/image',
            '/_next/data/',
            ...localizedRootAllowRules,
            ...publicLocales.flatMap((locale) => [
              `/${locale}/cybersecurity-solutions`,
              `/${locale}/cybersecurity-solutions/`,
              `/${locale}/cybersecurity-solutions/*`,
            ]),
            '/document/images/*',
          ],
        },
      ],
      sitemap: 'https://hub.filigran.io/sitemap.xml',
    };
  }

  // Development & Prerelease - Block everything
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
    },
  };
}
