import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const isProductionOrStaging =
  process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  redirects: async () => {
    return [
      // Redirect browser navigation only; keep GraphQL API requests untouched.
      ...(process.env.NODE_ENV === 'production'
        ? [
            {
              source: '/graphql-api',
              has: [{ type: 'header', key: 'accept', value: '.*text/html.*' }],
              destination: '/',
              permanent: true,
            },
          ]
        : []),

      {
        source:
          '/app/service/(free-trial|opencti-free-trial|openaev-free-trial)',
        destination: '/app/service/xtm-platform-trial',
        permanent: true,
      },
      {
        source: '/app/admin/trials',
        destination: '/app/admin/opencti-trials',
        permanent: true,
      },

      // open-bas / obas → openaev
      {
        source: '/app/service/(open-bas-scenarios|obas_scenarios)/:path*',
        destination: '/app/service/openaev_scenarios/:path*',
        permanent: true,
      },

      // octi integration feeds → opencti integrations
      {
        source:
          '/app/service/(octi_integration_feeds|open-cti-integration-feeds)/:path*',
        destination: '/app/service/opencti_integrations/:path*',
        permanent: true,
      },

      // octi custom dashboards → opencti custom dashboards
      {
        source: '/app/service/octi_custom_dashboards/:path*',
        destination: '/app/service/opencti_custom_dashboards/:path*',
        permanent: true,
      },
      {
        source: '/redirect/octi_custom_dashboards/:path*',
        destination: '/redirect/opencti_custom_dashboards/:path*',
        permanent: true,
      },

      // -------------------------
      // Cybersecurity solutions
      // -------------------------

      {
        source: '/cybersecurity-solutions/public-roadmap',
        destination: '/cybersecurity-solutions/xtm-platform-roadmap',
        permanent: true,
      },
      {
        source:
          '/cybersecurity-solutions/(free-trial|opencti-free-trial|openaev-free-trial)',
        destination: '/cybersecurity-solutions/xtm-platform-trial',
        permanent: true,
      },
      {
        source:
          '/:locale(en|ja)/cybersecurity-solutions/(opencti-free-trial|openaev-free-trial)',
        destination: '/:locale/cybersecurity-solutions/xtm-platform-trial',
        permanent: true,
      },
      {
        source:
          '/cybersecurity-solutions/(open-bas-scenarios|obas-scenarios|open-aev-scenarios)/:path*',
        destination: '/cybersecurity-solutions/openaev-scenarios/:path*',
        permanent: true,
      },

      {
        source:
          '/cybersecurity-solutions/(octi_integration_feeds|open-cti-integration-feeds|open-cti-integrations)/:path*',
        destination: '/cybersecurity-solutions/opencti-integrations/:path*',
        permanent: true,
      },

      {
        source:
          '/cybersecurity-solutions/(octi_custom_dashboards|open-cti-custom-dashboards)/:path*',
        destination:
          '/cybersecurity-solutions/opencti-custom-dashboards/:path*',
        permanent: true,
      },
    ];
  },
  headers: async () => {
    const isDev = process.env.NODE_ENV !== 'production';
    const hubspotScriptHosts = [
      'https://js-eu1.hs-scripts.com',
      'https://js-eu1.hsadspixel.net',
      'https://js-eu1.hubspot.com',
      'https://js-eu1.hs-analytics.net',
      'https://js-eu1.hs-banner.com',
      'https://js-eu1.hsforms.net',
    ];
    const apolloCdnHosts = [
      'https://embeddable-sandbox.cdn.apollographql.com',
      'https://apollo-server-landing-page.cdn.apollographql.com',
    ];

    const scriptSrc = [
      "'self'",
      "'unsafe-inline'",
      'https://www.googletagmanager.com',
      'https://snap.licdn.com',
      'https://copilot.filigran.ai',
      ...hubspotScriptHosts,
      ...(isDev ? ["'unsafe-eval'", ...apolloCdnHosts] : []),
    ].join(' ');
    // Explanation of CSP directives:
    // default-src 'self': block everything except my domain
    // script-src: Mandatory for NextJS because we don't use nounces
    // style-src: For Next to add inline CSS
    // img-src: because we have images.remotePatterns
    // font-src: because we use fonts from our domain and data: for inline fonts
    // connect-src: allow fetch/graphQL/external apis
    // related to frame : blocks iframes
    // rest at the end: protects against XSS, clickjacking and injection
    // upgrade-insecure-requests: force to https

    const imgSrc = [
      "'self'",
      'data:',
      'blob:',
      'https://res.cloudinary.com',
      'https://perf-eu1.hsforms.com',
      'https://s.gravatar.com',
      'https://secure.gravatar.com',
      'https://cdn.auth0.com',
      'https://*.wp.com',
      'https://track-eu1.hubspot.com',
      'https://*.filigran.io',
      'https://*.filigran.ai',
      ...(!isProductionOrStaging ? apolloCdnHosts : []),
    ].join(' ');

    const styleSrc = [
      "'self'",
      "'unsafe-inline'",
      'https://fonts.googleapis.com',
    ].join(' ');

    const manifestSrc = !isProductionOrStaging
      ? apolloCdnHosts.join(' ')
      : "'self'";
    const defaultSrcSuffix = isProductionOrStaging
      ? ''
      : ` ${apolloCdnHosts.join(' ')}`;

    const cspDirectives = [
      `default-src 'self'${defaultSrcSuffix}`,
      `script-src ${scriptSrc}`,
      `style-src ${styleSrc}`,
      `img-src ${imgSrc}`,
      `font-src 'self' data:${!isProductionOrStaging ? ' https://fonts.gstatic.com' : ''}`,
      `connect-src 'self' https:${!isProductionOrStaging ? ' http:' : ''}`,
      `frame-src 'self' https://www.youtube.com https://forms-eu1.hsforms.com${!isProductionOrStaging ? ' https://sandbox.embed.apollographql.com' : ''}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' https://forms-eu1.hsforms.com",
      "object-src 'none'",
      `manifest-src ${manifestSrc}`,
      ...(!isProductionOrStaging ? ['upgrade-insecure-requests'] : []),
    ];

    const csp = cspDirectives.join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: csp,
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
    ];
  },
  output: 'standalone',
  logging: {
    fetches: {
      fullUrl:
        process.env.NODE_ENV !== 'production' &&
        process.env.NODE_ENV !== 'staging',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '**',
        search: '',
      },
    ],
    minimumCacheTTL: 60 * 60 * 24,
    maximumDiskCacheSize: 100 * 1024 * 1024,
  },
  skipTrailingSlashRedirect: true,
  reactStrictMode: true,
  compiler: {
    relay: {
      src: './',
      language: 'typescript',
      artifactDirectory: '__generated__',
    },
  },
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  webpack(config) {
    // Grab the existing rule that handles SVG imports
    const fileLoaderRule = config.module.rules.find((rule) =>
      rule.test?.test?.('.svg')
    );

    config.module.rules.push(
      // Reapply the existing rule, but only for svg imports ending in ?url
      {
        ...fileLoaderRule,
        test: /\.svg$/i,
        resourceQuery: /url/, // *.svg?url
      },
      // Convert all other *.svg imports to React components
      {
        test: /\.svg$/i,
        issuer: fileLoaderRule.issuer,
        resourceQuery: { not: [...fileLoaderRule.resourceQuery.not, /url/] }, // exclude if *.svg?url
        use: ['@svgr/webpack'],
      }
    );

    // Modify the file loader rule to ignore *.svg, since we have it handled now.
    fileLoaderRule.exclude = /\.svg$/i;

    return config;
  },
  async rewrites() {
    return [
      {
        source: '/hs/:path*',
        destination: 'https://js-eu1.hs-analytics.net/:path*',
      },
    ];
  },
};

export default withNextIntl(nextConfig);
