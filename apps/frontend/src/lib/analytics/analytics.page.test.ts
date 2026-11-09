import {
  resolveAnalyticsPage,
  toAnalyticsPageLocation,
  toAnalyticsReferrer,
} from '@/lib/analytics/analytics.page';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SERVICE_INSTANCE_ID = '3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b';
const DOCUMENT_ID = '9c81d7e6-1a2b-4c3d-9e8f-7a6b5c4d3e2f';
const RELAY_DOCUMENT_ID = btoa(`Document:${DOCUMENT_ID}`);
const ORIGIN = 'https://hub.filigran.io';
const PUBLIC_RESOURCE_PATH =
  '/en/cybersecurity-solutions/opencti-playbooks/ransomware-playbook';
const PUBLIC_RESOURCE_TEMPLATE =
  '/[locale]/cybersecurity-solutions/[slug]/[docSlug]';
const PRIVATE_RESOURCE_PATH = `/app/service/opencti_playbooks/${SERVICE_INSTANCE_ID}/${DOCUMENT_ID}`;
const PRIVATE_RESOURCE_TEMPLATE =
  '/app/service/opencti_playbooks/[serviceInstanceId]/[documentId]';

describe('resolveAnalyticsPage', () => {
  it.each([
    ['/en', { locale: 'en' }, 'Home', '/[locale]'],
    ['/app', {}, 'Home', '/app'],
    [
      '/fr/cybersecurity-solutions/opencti-playbooks',
      { locale: 'fr', slug: 'opencti-playbooks' },
      'Library',
      '/[locale]/cybersecurity-solutions/[slug]',
    ],
    [
      '/ja/cybersecurity-solutions/opencti-playbooks/my%20playbook',
      { locale: 'ja', slug: 'opencti-playbooks', docSlug: 'my playbook' },
      'Resource page',
      '/[locale]/cybersecurity-solutions/[slug]/[docSlug]',
    ],
    [
      `/app/service/opencti_playbooks/${SERVICE_INSTANCE_ID}`,
      { serviceInstanceId: SERVICE_INSTANCE_ID },
      'Library',
      '/app/service/opencti_playbooks/[serviceInstanceId]',
    ],
    [
      `/app/service/opencti_playbooks/${SERVICE_INSTANCE_ID}/${DOCUMENT_ID}`,
      { serviceInstanceId: SERVICE_INSTANCE_ID, documentId: DOCUMENT_ID },
      'Resource page',
      '/app/service/opencti_playbooks/[serviceInstanceId]/[documentId]',
    ],
    [
      `/app/service/opencti_registration/${SERVICE_INSTANCE_ID}`,
      { serviceInstanceId: SERVICE_INSTANCE_ID },
      'Platform details',
      '/app/service/opencti_registration/[serviceInstanceId]',
    ],
    [
      `/app/service/openaev_registration/${SERVICE_INSTANCE_ID}`,
      { serviceInstanceId: SERVICE_INSTANCE_ID },
      'Platform details',
      '/app/service/openaev_registration/[serviceInstanceId]',
    ],
    [
      `/app/service/xtmone_registration/${SERVICE_INSTANCE_ID}`,
      { serviceInstanceId: SERVICE_INSTANCE_ID },
      'Platform details',
      '/app/service/xtmone_registration/[serviceInstanceId]',
    ],
    [
      '/en/cybersecurity-solutions/xtm-platform-roadmap/feature-voting',
      { locale: 'en' },
      'Roadmap',
      '/[locale]/cybersecurity-solutions/xtm-platform-roadmap/feature-voting',
    ],
    [
      `/app/service/xtm_platform_roadmap/${SERVICE_INSTANCE_ID}`,
      { serviceInstanceId: SERVICE_INSTANCE_ID },
      'Roadmap',
      '/app/service/xtm_platform_roadmap/[serviceInstanceId]',
    ],
    [
      '/en/cybersecurity-solutions/xtm-platform-trial',
      { locale: 'en' },
      'Trial',
      '/[locale]/cybersecurity-solutions/xtm-platform-trial',
    ],
    [
      `/app/service/xtm-platform-trial/${SERVICE_INSTANCE_ID}/manage-users`,
      { serviceInstanceId: SERVICE_INSTANCE_ID },
      'Trial',
      '/app/service/xtm-platform-trial/[serviceInstanceId]/manage-users',
    ],
    [
      '/app/service/xtm-platform-trial-guide',
      {},
      'Trial guide',
      '/app/service/xtm-platform-trial-guide',
    ],
    [
      '/app/admin/service/service',
      { slug: 'service' },
      'Admin',
      '/app/admin/service/[slug]',
    ],
    ['/app/admin/csm-board', {}, 'CSM board', '/app/admin/csm-board'],
    ['/app/profile', {}, 'Profile', '/app/profile'],
    [`/app/unknown/${DOCUMENT_ID}`, {}, 'Other', '/app/unknown/[id]'],
    [`/app/unknown/${RELAY_DOCUMENT_ID}`, {}, 'Other', '/app/unknown/[id]'],
  ])(
    'should resolve the page type and template when the path is %s',
    (pathname, params, pageType, pageTemplate) => {
      // Given / When
      const page = resolveAnalyticsPage(pathname, params);

      // Then
      expect(page).toEqual({
        page_type: pageType,
        page_template: pageTemplate,
      });
    }
  );
});

describe('toAnalyticsPageLocation', () => {
  it.each([
    [
      'keep the real path of a public page',
      PUBLIC_RESOURCE_PATH,
      PUBLIC_RESOURCE_TEMPLATE,
      '',
      `${ORIGIN}${PUBLIC_RESOURCE_PATH}`,
    ],
    [
      'replace the ids of a private page by its template',
      PRIVATE_RESOURCE_PATH,
      PRIVATE_RESOURCE_TEMPLATE,
      '',
      `${ORIGIN}${PRIVATE_RESOURCE_TEMPLATE}`,
    ],
    [
      'keep only the campaign parameters of the query string',
      PUBLIC_RESOURCE_PATH,
      PUBLIC_RESOURCE_TEMPLATE,
      '?search=acme&utm_source=newsletter&gclid=abc',
      `${ORIGIN}${PUBLIC_RESOURCE_PATH}?utm_source=newsletter&gclid=abc`,
    ],
    [
      'redact an e-mail in a campaign parameter',
      PUBLIC_RESOURCE_PATH,
      PUBLIC_RESOURCE_TEMPLATE,
      '?utm_term=jane%40acme.com',
      `${ORIGIN}${PUBLIC_RESOURCE_PATH}?utm_term=%5Bredacted%5D`,
    ],
    [
      'redact a twice encoded e-mail in a campaign parameter',
      PUBLIC_RESOURCE_PATH,
      PUBLIC_RESOURCE_TEMPLATE,
      '?utm_term=jane%2540acme.com',
      `${ORIGIN}${PUBLIC_RESOURCE_PATH}?utm_term=%5Bredacted%5D`,
    ],
    [
      'redact a platform address in a campaign parameter',
      PUBLIC_RESOURCE_PATH,
      PUBLIC_RESOURCE_TEMPLATE,
      '?utm_source=https%3A%2F%2Fcti.customer.com',
      `${ORIGIN}${PUBLIC_RESOURCE_PATH}?utm_source=%5Bredacted%5D`,
    ],
  ])(
    'should %s when building the page location',
    (_case, pathname, pageTemplate, search, pageLocation) => {
      // Given / When
      const location = toAnalyticsPageLocation(
        { origin: ORIGIN, pathname, search },
        pageTemplate
      );

      // Then
      expect(location).toBe(pageLocation);
    }
  );
});

describe('toAnalyticsReferrer', () => {
  it.each([
    ['', ''],
    ['https://www.google.com/search?q=opencti', 'https://www.google.com'],
    ['https://www.google.co.uk/', 'https://www.google.co.uk'],
    ['https://filigran.io/blog/post', 'https://filigran.io'],
    ['https://docs.filigran.io/latest/', 'https://docs.filigran.io'],
    [
      'https://filigran-community.slack.com/archives',
      'https://filigran-community.slack.com',
    ],
    ['https://cti.customer.com/dashboard/workspaces/abc', 'Other'],
    ['https://notgoogle.com/', 'Other'],
    ['https://filigran.io.example.com/', 'Other'],
    ['not a url', 'Other'],
    [
      `${ORIGIN}${PUBLIC_RESOURCE_PATH}?search=acme`,
      `${ORIGIN}${PUBLIC_RESOURCE_PATH}`,
    ],
    [
      `${ORIGIN}${PRIVATE_RESOURCE_PATH}`,
      `${ORIGIN}/app/service/opencti_playbooks/[id]/[id]`,
    ],
  ])(
    'should send the referrer %s as %s when building the page context',
    (referrer, pageReferrer) => {
      // Given / When
      const sent = toAnalyticsReferrer(referrer, ORIGIN);

      // Then
      expect(sent).toBe(pageReferrer);
    }
  );
});

const APP_DIRECTORY = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../app'
);
const ROUTE_GROUP_PATTERN = /^\(.*\)$/;
const EMBED_ROUTE_GROUP = '(embed)';
const ROUTE_TEMPLATES = readdirSync(APP_DIRECTORY, {
  encoding: 'utf8',
  recursive: true,
})
  .filter((file) => path.basename(file) === 'page.tsx')
  .map((file) => path.dirname(file).split(path.sep))
  .filter((segments) => !segments.includes(EMBED_ROUTE_GROUP))
  .map(
    (segments) =>
      `/${segments
        .filter(
          (segment) => segment !== '.' && !ROUTE_GROUP_PATTERN.test(segment)
        )
        .join('/')}`
  )
  .sort();
const OTHER_PAGE_ROUTES = [
  '/[locale]/cybersecurity-solutions',
  '/[locale]/editable-text',
  '/app/editable-text-demo',
  '/app/manage/service/[serviceInstanceId]/subscription/[subscriptionId]',
  '/app/manage/user',
  '/login',
  '/sign-up',
];
const TYPED_PAGE_ROUTES = ROUTE_TEMPLATES.filter(
  (template) => !OTHER_PAGE_ROUTES.includes(template)
);

describe('resolveAnalyticsPage on the application routes', () => {
  it.each(TYPED_PAGE_ROUTES.map((template) => [template]))(
    'should give the route %s an explicit page type',
    (template) => {
      // Given / When
      const { page_type } = resolveAnalyticsPage(template, {});

      // Then
      expect(page_type).not.toBe('Other');
    }
  );

  it.each(OTHER_PAGE_ROUTES.map((template) => [template]))(
    'should give the route %s the page type Other',
    (template) => {
      // Given / When
      const { page_type } = resolveAnalyticsPage(template, {});

      // Then
      expect(page_type).toBe('Other');
    }
  );

  it('should only list existing routes when allowing a route as Other', () => {
    // Given / When
    const unknownRoutes = OTHER_PAGE_ROUTES.filter(
      (template) => !ROUTE_TEMPLATES.includes(template)
    );

    // Then
    expect(unknownRoutes).toEqual([]);
  });
});
