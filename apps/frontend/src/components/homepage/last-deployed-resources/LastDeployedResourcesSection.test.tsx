import {
  PlatformContract,
  PlatformIdentifier,
  RegisteredPlatformsQuery,
  ServiceDefinitionIdentifier,
} from '@graphql/generated';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockLastDeployedResourcesClient, mockXtmPlatformImage } = vi.hoisted(
  () => ({
    mockLastDeployedResourcesClient: vi.fn(() => (
      <div data-testid="last-deployed-resources-client" />
    )),
    mockXtmPlatformImage: vi.fn(() => <div data-testid="xtm-platform-image" />),
  })
);

vi.mock('./LastDeployedResourcesClient', () => ({
  default: mockLastDeployedResourcesClient,
}));

vi.mock('@/components/homepage/xtm-platform/XtmPlatformImage', () => ({
  default: mockXtmPlatformImage,
}));

import LastDeployedResourcesSection from './LastDeployedResourcesSection';

const buildRegisteredPlatform = (
  overrides: Partial<
    RegisteredPlatformsQuery['registeredPlatforms'][number]
  > = {}
): RegisteredPlatformsQuery['registeredPlatforms'][number] => ({
  id: 'platform-1',
  identifier: ServiceDefinitionIdentifier.OpenctiRegistration,
  title: 'OpenCTI Platform',
  contract: PlatformContract.Ee,
  deployment_request: null,
  subscription: {
    start_date: null,
    end_date: null,
    service_instance_id: 'svc-1',
  },
  ...overrides,
});

describe('LastDeployedResourcesSection', () => {
  beforeEach(() => {
    mockLastDeployedResourcesClient.mockClear();
    mockXtmPlatformImage.mockClear();
  });

  it('renders the empty state image when no platform has a deployed resource', async () => {
    const registeredPlatformsData: RegisteredPlatformsQuery = {
      registeredPlatforms: [],
    };

    render(await LastDeployedResourcesSection({ registeredPlatformsData }));

    expect(screen.getByTestId('xtm-platform-image')).toBeInTheDocument();
    expect(
      screen.queryByTestId('last-deployed-resources-client')
    ).not.toBeInTheDocument();
  });

  it('renders the client component when at least one platform has a deployed resource', async () => {
    const registeredPlatformsData: RegisteredPlatformsQuery = {
      registeredPlatforms: [buildRegisteredPlatform()],
    };

    render(await LastDeployedResourcesSection({ registeredPlatformsData }));

    expect(
      screen.getByTestId('last-deployed-resources-client')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('xtm-platform-image')).not.toBeInTheDocument();
    expect(mockLastDeployedResourcesClient).toHaveBeenCalledWith(
      {
        platforms: [
          {
            serviceInstanceId: 'svc-1',
            title: 'OpenCTI Platform',
            platformIdentifier: PlatformIdentifier.Opencti,
          },
        ],
      },
      undefined
    );
  });

  it('ignores platforms without a deployed service instance', async () => {
    const registeredPlatformsData: RegisteredPlatformsQuery = {
      registeredPlatforms: [buildRegisteredPlatform({ subscription: null })],
    };

    render(await LastDeployedResourcesSection({ registeredPlatformsData }));

    expect(screen.getByTestId('xtm-platform-image')).toBeInTheDocument();
  });
});
