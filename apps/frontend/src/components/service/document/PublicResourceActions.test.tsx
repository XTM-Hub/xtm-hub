import { PublicResourceActions } from '@/components/service/document/PublicResourceActions';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { readTrackedEvents, startAnalytics } from '@/utils/test/analytics';
import testRender from '@/utils/test/test-render';
import { PublicDocumentByServiceSlugItemFragment } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ useMeAnalyticsQuery: vi.fn() }));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useMeAnalyticsQuery: mocks.useMeAnalyticsQuery,
  });
});

const DOCUMENT_ID = 'doc-1';
const PUBLIC_PATHNAME = '/en/cybersecurity-solutions/lib/doc';
const PAGE_URL = 'https://hub.test/cybersecurity-solutions/lib/doc';
const DEPLOY_KEY = 'Service.ShareableResources.Deploy.DeployPlatform';
const DOWNLOAD_ICON_KEY = 'Service.ShareableResources.Download';
const DOWNLOAD_TEXT_KEY = 'PublicResourcePage.Download';
const UNAVAILABLE_DEPLOYMENTS_KEY = 'Service.Connectors.UnavailableDeployments';
const RESOURCE_NOT_DEPLOYABLE = 'Resource not deployable';

const UNSUPPORTED_CONNECTOR_OVERRIDES = {
  __typename: 'Connector',
  type: ShareableResourceType.OPENCTI_INTEGRATION,
  integration_type: 'connector',
  manager_supported: false,
} as const;

const SIGNED_OUT_VISITOR = { data: { me: null }, isPending: false };
const SIGNED_IN_VISITOR = {
  data: {
    me: {
      email: 'jane@acme.com',
      selected_organization_id: null,
      organizations: [],
      capabilities: [],
      selected_org_capabilities: [],
    },
  },
  isPending: false,
};

const signupHrefFor = (pathname: string) =>
  `/sign-up?redirect=${encodeURIComponent(
    btoa(`/redirect/public?path=${encodeURIComponent(pathname)}`)
  )}`;

const buildDocumentData = (
  overrides: Partial<PublicDocumentByServiceSlugItemFragment> = {}
): PublicDocumentByServiceSlugItemFragment =>
  ({
    __typename: 'CustomDashboard',
    id: DOCUMENT_ID,
    status: 'published',
    type: ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD,
    ...overrides,
  }) as PublicDocumentByServiceSlugItemFragment;

const renderActions = (documentData: PublicDocumentByServiceSlugItemFragment) =>
  testRender(
    <PublicResourceActions
      documentData={documentData}
      pageUrl={PAGE_URL}
    />
  );

describe('PublicResourceActions', () => {
  beforeEach(() => {
    mocks.useMeAnalyticsQuery.mockReturnValue({
      data: undefined,
      isPending: true,
    });
    vi.mocked(usePathname).mockReturnValue(PUBLIC_PATHNAME);
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
      platformName: 'OpenCTI',
    },
    {
      resource: 'OpenAEV scenario',
      overrides: {
        __typename: 'OpenaevScenario',
        type: ShareableResourceType.OPENAEV_SCENARIO,
      },
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
      platformName: 'OpenCTI',
    },
  ])(
    'should link deploy and download icon to the sign-up page when the resource is a $resource',
    ({ overrides, platformName }) => {
      // Given
      const documentData = buildDocumentData(overrides);
      const expectedHref = signupHrefFor(PUBLIC_PATHNAME);

      // When
      renderActions(documentData);

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

  it('should show a text download button and no deploy button when the resource is a draft', () => {
    // Given
    const documentData = buildDocumentData({ status: 'draft' });

    // When
    renderActions(documentData);

    // Then
    expect(screen.getByText(DOWNLOAD_TEXT_KEY).closest('a')).toHaveAttribute(
      'href',
      signupHrefFor(PUBLIC_PATHNAME)
    );
    expect(screen.queryByText(`${DEPLOY_KEY}:OpenCTI`)).not.toBeInTheDocument();
  });

  it('should disable the deploy button when the connector is not manager supported', () => {
    // Given
    const documentData = buildDocumentData(UNSUPPORTED_CONNECTOR_OVERRIDES);

    // When
    renderActions(documentData);

    // Then
    expect(
      screen.getByText(`${DEPLOY_KEY}:OpenCTI`).closest('button')
    ).toBeDisabled();
    expect(screen.getByText(`${DEPLOY_KEY}:OpenCTI`).closest('a')).toBeNull();
  });

  it('should explain why deploy is unavailable when the keyboard reaches the disabled deploy button of a connector without manager support', async () => {
    // Given
    const documentData = buildDocumentData(UNSUPPORTED_CONNECTOR_OVERRIDES);
    const { user } = renderActions(documentData);

    // When
    // Share and download come before deploy in the tab order.
    await user.tab();
    await user.tab();
    await user.tab();

    // Then
    expect(
      await screen.findByRole('tooltip', { name: UNAVAILABLE_DEPLOYMENTS_KEY })
    ).toBeInTheDocument();
  });

  it('should percent-encode the public path so it survives the signup redirect round-trip', () => {
    // Given
    const pathnameWithSpecialChars = '/en/cybersecurity-solutions/lib/c++&co';
    vi.mocked(usePathname).mockReturnValue(pathnameWithSpecialChars);
    const documentData = buildDocumentData();

    // When
    renderActions(documentData);

    // Then
    const href =
      screen
        .getByRole('link', { name: DOWNLOAD_ICON_KEY })
        .getAttribute('href') ?? '';
    expect(href).toBe(signupHrefFor(pathnameWithSpecialChars));

    const redirectTarget = atob(
      new URLSearchParams(href.split('?')[1]).get('redirect') ?? ''
    );
    const query = new URLSearchParams(redirectTarget.split('?')[1]);
    expect(query.get('path')).toBe(pathnameWithSpecialChars);
  });

  describe('resource view', () => {
    beforeEach(() => {
      startAnalytics();
    });

    it('should not send the resource view when the visitor is not known yet', () => {
      // Given / When
      renderActions(buildDocumentData());

      // Then
      expect(readTrackedEvents('view_item')).toEqual([]);
    });

    it.each([
      ['Signed out', 'a deployable resource', {}],
      [
        RESOURCE_NOT_DEPLOYABLE,
        'a connector without manager support',
        UNSUPPORTED_CONNECTOR_OVERRIDES,
      ],
    ])(
      'should send %s as the deploy eligibility when a signed-out visitor views %s',
      (expected, _context, overrides) => {
        // Given
        mocks.useMeAnalyticsQuery.mockReturnValue(SIGNED_OUT_VISITOR);

        // When
        renderActions(buildDocumentData(overrides));

        // Then
        expect(readTrackedEvents('view_item')).toEqual([
          expect.objectContaining({ deploy_eligibility: expected }),
        ]);
      }
    );

    it('should send no deploy eligibility when a signed-in visitor views the resource', () => {
      // Given
      mocks.useMeAnalyticsQuery.mockReturnValue(SIGNED_IN_VISITOR);

      // When
      renderActions(buildDocumentData());

      // Then
      expect(readTrackedEvents('view_item')).toEqual([
        expect.not.objectContaining({ deploy_eligibility: expect.anything() }),
      ]);
    });

    it('should send Resource not deployable as the deploy eligibility when a signed-in visitor views a connector without manager support', () => {
      // Given
      mocks.useMeAnalyticsQuery.mockReturnValue(SIGNED_IN_VISITOR);

      // When
      renderActions(buildDocumentData(UNSUPPORTED_CONNECTOR_OVERRIDES));

      // Then
      expect(readTrackedEvents('view_item')).toEqual([
        expect.objectContaining({
          deploy_eligibility: RESOURCE_NOT_DEPLOYABLE,
        }),
      ]);
    });
  });
});
