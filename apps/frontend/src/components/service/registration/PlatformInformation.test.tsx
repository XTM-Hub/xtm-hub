import { PlatformInformation } from '@/components/service/registration/PlatformInformation';
import { basePlatform } from '@/components/service/registration/registered-platform.fixtures';
import testRender from '@/utils/test/test-render';
import { registeredPlatformByServiceInstanceId_fragment$data } from '@generated/registeredPlatformByServiceInstanceId_fragment.graphql';
import { SaasPlatformMetadata } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const HOSTNAME = 'my-platform.filigran.io';

const platform: registeredPlatformByServiceInstanceId_fragment$data =
  basePlatform;

const metadata: SaasPlatformMetadata = {
  hostname: HOSTNAME,
  plan: null,
  start_date: null,
  end_date: null,
  region: null,
};

vi.mock('react-relay', async (importOriginal) => ({
  ...(await importOriginal()),
  useFragment: () => platform,
}));

const renderInformation = ({
  showMetadata = true,
  isMetadataLoading = false,
}: { showMetadata?: boolean; isMetadataLoading?: boolean } = {}) =>
  testRender(
    <PlatformInformation
      registeredPlatform={platform}
      showMetadata={showMetadata}
      metadata={isMetadataLoading ? undefined : metadata}
      isMetadataLoading={isMetadataLoading}
    />
  );

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PlatformInformation', () => {
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

  it('should display the SaaS subscription metadata of the platform when asked to', () => {
    // Given / When
    renderInformation();

    // Then
    expect(screen.getByText(HOSTNAME)).toBeInTheDocument();
  });

  it('should not display the SaaS subscription metadata of the platform when not asked to', () => {
    // Given / When
    renderInformation({ showMetadata: false });

    // Then
    expect(
      screen.queryByText('Register.Metrics.Metadata.Hostname:')
    ).not.toBeInTheDocument();
    expect(screen.getByText(platform.url)).toBeInTheDocument();
  });

  it('should display the SaaS subscription metadata as loading while it is loading', () => {
    // Given / When
    renderInformation({ isMetadataLoading: true });

    // Then
    expect(
      screen.getByText('Register.Metrics.Metadata.Hostname:').closest('section')
    ).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText(HOSTNAME)).not.toBeInTheDocument();
  });
});
