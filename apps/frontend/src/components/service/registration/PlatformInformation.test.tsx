import { PlatformInformation } from '@/components/service/registration/PlatformInformation';
import { basePlatform } from '@/components/service/registration/registered-platform.fixtures';
import { useIsFeatureEnabled } from '@/hooks/use-is-feature-enabled';
import testRender from '@/utils/test/test-render';
import { registeredPlatformByServiceInstanceId_fragment$data } from '@generated/registeredPlatformByServiceInstanceId_fragment.graphql';
import {
  CommercialModel,
  useRegisteredSaasPlatformMetadataQuery,
} from '@graphql/generated';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const HOSTNAME = 'my-platform.filigran.io';

const platform: registeredPlatformByServiceInstanceId_fragment$data = {
  ...basePlatform,
  commercial_model: CommercialModel.Saas,
};

vi.mock('react-relay', async (importOriginal) => ({
  ...(await importOriginal()),
  useFragment: () => platform,
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@graphql/generated')>();
  const useRegisteredSaasPlatformMetadataQuery = Object.assign(vi.fn(), {
    getKey: actual.useRegisteredSaasPlatformMetadataQuery.getKey,
  });
  return { ...actual, useRegisteredSaasPlatformMetadataQuery };
});

const mockMetadataQuery = () =>
  vi.mocked(useRegisteredSaasPlatformMetadataQuery).mockReturnValue({
    data: {
      registeredSaasPlatformMetadata: {
        hostname: HOSTNAME,
        plan: null,
        start_date: null,
        end_date: null,
        region: null,
      },
    },
    isPending: false,
  } as ReturnType<typeof useRegisteredSaasPlatformMetadataQuery>);

const renderInformation = () =>
  testRender(<PlatformInformation registeredPlatform={platform} />);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PlatformInformation', () => {
  beforeEach(() => {
    vi.mocked(useIsFeatureEnabled).mockReturnValue(true);
    mockMetadataQuery();
  });

  it('should display the platform information heading', () => {
    // Given / When
    renderInformation();

    // Then
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Register.Details.PlatformInformation',
      })
    ).toBeInTheDocument();
  });

  it('should display the registration details of the platform', () => {
    // Given / When
    renderInformation();

    // Then
    expect(screen.getByText(platform.url)).toBeInTheDocument();
  });

  it('should display the SaaS subscription metadata of the platform when SAAS_METRICS is enabled', () => {
    // Given / When
    renderInformation();

    // Then
    expect(screen.getByText(HOSTNAME)).toBeInTheDocument();
  });

  it('should not display the SaaS subscription metadata of the platform when SAAS_METRICS is disabled', () => {
    // Given SAAS_METRICS is disabled
    vi.mocked(useIsFeatureEnabled).mockReturnValue(false);

    // When
    renderInformation();

    // Then
    expect(screen.queryByText(HOSTNAME)).not.toBeInTheDocument();
    expect(screen.getByText(platform.url)).toBeInTheDocument();
  });
});
