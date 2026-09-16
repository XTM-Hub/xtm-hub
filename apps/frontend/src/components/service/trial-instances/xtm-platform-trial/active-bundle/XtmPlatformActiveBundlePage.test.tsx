import testRender from '@/utils/test/test-render';
import { PlatformIdentifier } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { XtmPlatformActiveBundlePage } from './XtmPlatformActiveBundlePage';

const mockUseGranted = vi.fn();
vi.mock('@/hooks/use-granted', () => ({
  default: (...args: Parameters<typeof mockUseGranted>) =>
    mockUseGranted(...args),
}));

const mockUseAdminByPass = vi.fn();
vi.mock('@/hooks/use-portal-capability', () => ({
  useAdminByPass: () => mockUseAdminByPass(),
}));

const mockUseXtmPlatformBundleQuery = vi.fn();
vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useXtmPlatformBundleQuery: (
    ...args: Parameters<typeof mockUseXtmPlatformBundleQuery>
  ) => mockUseXtmPlatformBundleQuery(...args),
}));

vi.mock('@graphql/deployment/deployment.keys', () => ({
  xtmPlatformBundleKeys: {
    all: () => ['XtmPlatformBundle'],
  },
}));

vi.mock(
  '@/components/service/trial-instances/xtm-platform-trial/active-bundle/useXtmoneIntegrationStatus',
  () => ({
    useXtmoneIntegrationStatus: () => ({
      data: undefined,
      isLoading: false,
      isError: false,
    }),
  })
);

vi.mock(
  '@/components/service/trial-instances/xtm-platform-trial/active-bundle/BundleInfoCard',
  () => ({
    BundleInfoCard: () => <div data-testid="bundle-info-card" />,
  })
);

vi.mock(
  '@/components/service/trial-instances/xtm-platform-trial/active-bundle/BundleGuideCard',
  () => ({
    BundleGuideCard: () => <div data-testid="bundle-guide-card" />,
  })
);

vi.mock(
  '@/components/service/trial-instances/xtm-platform-trial/active-bundle/BundleProductCard',
  () => ({
    BundleProductCard: ({
      product,
    }: {
      product: { service_instance_id: string };
    }) => (
      <div data-testid={`bundle-product-card-${product.service_instance_id}`} />
    ),
  })
);

vi.mock(
  '@/components/service/trial-instances/xtm-platform-trial/shared/XtmPlatformTrialLimitations',
  () => ({
    XtmPlatformTrialLimitations: () => <div data-testid="trial-limitations" />,
  })
);

vi.mock(
  '@/components/service/trial-instances/reach-sales/ReachSalesButton',
  () => ({
    ReachSalesButton: () => <div data-testid="reach-sales-button" />,
  })
);

vi.mock('@/components/service/trial-instances/SlackSupport', () => ({
  SlackSupportButton: () => <div data-testid="slack-support-button" />,
}));

describe('XtmPlatformActiveBundlePage', () => {
  beforeEach(() => {
    mockUseGranted.mockReset().mockReturnValue(false);
    mockUseAdminByPass.mockReset().mockReturnValue(false);
    mockUseXtmPlatformBundleQuery.mockReset();
  });

  it('should render nothing while the bundle query is loading', () => {
    // Given
    mockUseXtmPlatformBundleQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    // When
    const { container } = testRender(<XtmPlatformActiveBundlePage />);

    // Then
    expect(container).not.toHaveTextContent('XtmPlatformTrial.Title');
    expect(screen.queryByTestId('bundle-info-card')).not.toBeInTheDocument();
  });

  it('should render nothing when there is no active bundle', () => {
    // Given
    mockUseXtmPlatformBundleQuery.mockReturnValue({
      data: { xtmPlatformBundle: null },
      isLoading: false,
    });

    // When
    testRender(<XtmPlatformActiveBundlePage />);

    // Then
    expect(
      screen.queryByText('XtmPlatformTrial.Title')
    ).not.toBeInTheDocument();
  });

  it('should render the bundle dashboard with its products ordered by platform when a bundle is loaded', () => {
    // Given
    mockUseXtmPlatformBundleQuery.mockReturnValue({
      data: {
        xtmPlatformBundle: {
          children: [
            {
              service_instance_id: 'xtmone-instance',
              platform_identifier: PlatformIdentifier.Xtmone,
            },
            {
              service_instance_id: 'opencti-instance',
              platform_identifier: PlatformIdentifier.Opencti,
            },
          ],
        },
      },
      isLoading: false,
    });

    // When
    testRender(<XtmPlatformActiveBundlePage />);

    // Then
    expect(screen.getByText('XtmPlatformTrial.Title')).toBeInTheDocument();
    expect(screen.getByTestId('bundle-info-card')).toBeInTheDocument();
    expect(screen.getByTestId('bundle-guide-card')).toBeInTheDocument();
    expect(screen.getByTestId('trial-limitations')).toBeInTheDocument();
    expect(
      screen.getByTestId('bundle-product-card-opencti-instance')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('bundle-product-card-xtmone-instance')
    ).toBeInTheDocument();
  });

  it('should not render a product card for a platform absent from the bundle children', () => {
    // Given
    mockUseXtmPlatformBundleQuery.mockReturnValue({
      data: {
        xtmPlatformBundle: {
          children: [
            {
              service_instance_id: 'opencti-instance',
              platform_identifier: PlatformIdentifier.Opencti,
            },
          ],
        },
      },
      isLoading: false,
    });

    // When
    testRender(<XtmPlatformActiveBundlePage />);

    // Then
    expect(
      screen.queryByTestId('bundle-product-card-xtmone-instance')
    ).not.toBeInTheDocument();
  });

  it('should grant manage permissions to the bundle info card when the user is an admin bypass', () => {
    // Given
    mockUseAdminByPass.mockReturnValue(true);
    mockUseXtmPlatformBundleQuery.mockReturnValue({
      data: {
        xtmPlatformBundle: {
          children: [],
        },
      },
      isLoading: false,
    });

    // When
    testRender(<XtmPlatformActiveBundlePage />);

    // Then
    expect(screen.getByTestId('bundle-info-card')).toBeInTheDocument();
  });
});
