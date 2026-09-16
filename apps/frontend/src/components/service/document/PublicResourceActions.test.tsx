import { PublicResourceActions } from '@/components/service/document/PublicResourceActions';
import {
  ServiceSlug,
  ShareableResourceType,
} from '@/utils/shareable-resources/shareable-resources.types';
import testRender from '@/utils/test/test-render';
import { publicDocumentBySlugItemFragment$data } from '@generated/publicDocumentBySlugItemFragment.graphql';
import { screen } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const DOCUMENT_ID = 'doc-1';
const SERVICE_INSTANCE_ID = 'service-instance-1';
const PAGE_URL = 'https://hub.test/cybersecurity-solutions/lib/doc';
const DEPLOY_KEY = 'Service.ShareableResources.Deploy.DeployPlatform';
const DOWNLOAD_ICON_KEY = 'Service.ShareableResources.Download';
const DOWNLOAD_TEXT_KEY = 'PublicResourcePage.Download';

const signupHrefFor = (slug: ServiceSlug) =>
  `/sign-up?redirect=${encodeURIComponent(
    btoa(
      `/redirect/${slug.replaceAll('-', '_')}?service_instance_id=${SERVICE_INSTANCE_ID}&document_id=${DOCUMENT_ID}`
    )
  )}`;

const buildDocumentData = (
  overrides: Partial<publicDocumentBySlugItemFragment$data> = {}
): publicDocumentBySlugItemFragment$data =>
  ({
    __typename: 'CustomDashboard',
    id: DOCUMENT_ID,
    active: true,
    type: ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD,
    ...overrides,
  }) as publicDocumentBySlugItemFragment$data;

const renderActions = (
  documentData: publicDocumentBySlugItemFragment$data,
  slug: ServiceSlug
) =>
  testRender(
    <PublicResourceActions
      documentData={documentData}
      serviceInstance={{ id: SERVICE_INSTANCE_ID, slug }}
      pageUrl={PAGE_URL}
    />
  );

describe('PublicResourceActions', () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue(
      '/en/cybersecurity-solutions/lib/doc'
    );
    vi.mocked(useTranslations).mockReturnValue(
      Object.assign(
        (key: string, values?: { platformName?: string }) =>
          values?.platformName ? `${key}:${values.platformName}` : key,
        { has: () => false, rich: (key: string) => key }
      )
    );
  });

  it.each([
    {
      resource: 'custom dashboard',
      overrides: {},
      slug: ServiceSlug.OPEN_CTI_CUSTOM_DASHBOARDS,
      platformName: 'OpenCTI',
    },
    {
      resource: 'OpenAEV scenario',
      overrides: {
        __typename: 'OpenaevScenario',
        type: ShareableResourceType.OPENAEV_SCENARIO,
      },
      slug: ServiceSlug.OPEN_AEV_SCENARIOS,
      platformName: 'OpenAEV',
    },
    {
      resource: 'manager-supported connector',
      overrides: {
        __typename: 'Connector',
        type: ShareableResourceType.OPENCTI_INTEGRATION,
        integration_type: 'connector' as const,
        manager_supported: true,
      },
      slug: ServiceSlug.OPEN_CTI_INTEGRATIONS,
      platformName: 'OpenCTI',
    },
  ])(
    'should link deploy and download icon to the sign-up page when the resource is a $resource',
    ({ overrides, slug, platformName }) => {
      // Given
      const documentData = buildDocumentData(overrides);
      const expectedHref = signupHrefFor(slug);

      // When
      renderActions(documentData, slug);

      // Then
      expect(
        screen.getByText(`${DEPLOY_KEY}:${platformName}`).closest('a')
      ).toHaveAttribute('href', expectedHref);
      expect(
        screen.getByRole('link', { name: DOWNLOAD_ICON_KEY })
      ).toHaveAttribute('href', expectedHref);
      expect(screen.queryByText(DOWNLOAD_TEXT_KEY)).not.toBeInTheDocument();
    }
  );

  it('should show a text download button and no deploy button when the resource is inactive', () => {
    // Given
    const documentData = buildDocumentData({ active: false });

    // When
    renderActions(documentData, ServiceSlug.OPEN_CTI_CUSTOM_DASHBOARDS);

    // Then
    expect(screen.getByText(DOWNLOAD_TEXT_KEY).closest('a')).toHaveAttribute(
      'href',
      signupHrefFor(ServiceSlug.OPEN_CTI_CUSTOM_DASHBOARDS)
    );
    expect(screen.queryByText(`${DEPLOY_KEY}:OpenCTI`)).not.toBeInTheDocument();
  });

  it('should disable the deploy button when the connector is not manager supported', () => {
    // Given
    const documentData = buildDocumentData({
      __typename: 'Connector',
      type: ShareableResourceType.OPENCTI_INTEGRATION,
      integration_type: 'connector',
      manager_supported: false,
    });

    // When
    renderActions(documentData, ServiceSlug.OPEN_CTI_INTEGRATIONS);

    // Then
    expect(
      screen.getByText(`${DEPLOY_KEY}:OpenCTI`).closest('button')
    ).toBeDisabled();
    expect(screen.getByText(`${DEPLOY_KEY}:OpenCTI`).closest('a')).toBeNull();
  });
});
