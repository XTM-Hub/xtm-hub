import {
  PlatformIdentifier,
  ServiceDefinitionIdentifier,
} from '@graphql/generated';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockRegisteredPlatformsFetcher,
  mockServiceInstancesFetcher,
  mockMeFirstNameFetcher,
  mockNewestResources,
  mockMostDeployedResources,
  mockPrivateHomepageRoadmapSection,
  mockXtmPlatform,
  mockRegisteredPlatformsSection,
  mockLastDeployedResourcesSection,
} = vi.hoisted(() => ({
  mockRegisteredPlatformsFetcher: vi.fn(),
  mockServiceInstancesFetcher: vi.fn(),
  mockMeFirstNameFetcher: vi.fn(),
  mockNewestResources: vi.fn(() => <div data-testid="newest-resources" />),
  mockMostDeployedResources: vi.fn(() => (
    <div data-testid="most-deployed-resources" />
  )),
  mockPrivateHomepageRoadmapSection: vi.fn(() => (
    <div data-testid="private-homepage-roadmap-section" />
  )),
  mockXtmPlatform: vi.fn(() => <div data-testid="xtm-platform" />),
  mockRegisteredPlatformsSection: vi.fn(() => (
    <div data-testid="registered-platforms-section" />
  )),
  mockLastDeployedResourcesSection: vi.fn(() => (
    <div data-testid="last-deployed-resources-section" />
  )),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@graphql/generated')>();
  return {
    ...actual,
    useRegisteredPlatformsQuery: {
      fetcher: mockRegisteredPlatformsFetcher,
    },
    useServiceInstancesListQuery: {
      fetcher: mockServiceInstancesFetcher,
    },
    useMeFirstNameQuery: {
      fetcher: mockMeFirstNameFetcher,
    },
  };
});

vi.mock('next-intl/server', () => ({
  getLocale: vi.fn().mockResolvedValue('en'),
}));

vi.mock('@/lib/graphql-client', () => ({
  getAuthenticatedGraphqlClient: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/components/homepage/resources/NewestResources', () => ({
  default: mockNewestResources,
}));

vi.mock('@/components/homepage/resources/MostDeployedResources', () => ({
  default: mockMostDeployedResources,
}));

vi.mock('@/components/homepage/roadmap/PrivateHomepageRoadmapSection', () => ({
  default: mockPrivateHomepageRoadmapSection,
}));

vi.mock('@/components/homepage/xtm-platform/XtmPlatform', () => ({
  default: mockXtmPlatform,
}));

vi.mock(
  '@/components/homepage/registered-platforms/RegisteredPlatformsSection',
  () => ({
    RegisteredPlatformsSection: mockRegisteredPlatformsSection,
  })
);

vi.mock(
  '@/components/homepage/last-deployed-resources/LastDeployedResourcesSection',
  () => ({
    default: mockLastDeployedResourcesSection,
  })
);

import { PrivateHomepage } from './PrivateHomepage';

const ROADMAP_SERVICE_INSTANCE_ID = 'roadmap-1';

const mockRegisteredPlatformsResponses = (registeredPlatforms: unknown[]) => {
  mockRegisteredPlatformsFetcher.mockReturnValue(() =>
    Promise.resolve({
      registeredPlatforms,
    })
  );
};

const mockMeFirstNameResponse = (first_name: string | null) => {
  mockMeFirstNameFetcher.mockReturnValue(() =>
    Promise.resolve({ me: first_name === null ? null : { first_name } })
  );
};

describe('PrivateHomepage', () => {
  beforeEach(() => {
    mockRegisteredPlatformsFetcher.mockClear();
    mockServiceInstancesFetcher.mockClear();
    mockMeFirstNameFetcher.mockClear();
    mockMeFirstNameResponse(null);
    mockNewestResources.mockClear();
    mockMostDeployedResources.mockClear();
    mockPrivateHomepageRoadmapSection.mockClear();
    mockXtmPlatform.mockClear();
    mockRegisteredPlatformsSection.mockClear();
    mockLastDeployedResourcesSection.mockClear();

    mockServiceInstancesFetcher.mockReturnValue(() =>
      Promise.resolve({
        serviceInstances: {
          edges: [],
        },
      })
    );
  });

  it('passes a single-item platformIdentifiers array and renders cards when one platform is registered', async () => {
    mockRegisteredPlatformsResponses([
      {
        id: '1',
        identifier: ServiceDefinitionIdentifier.OpenctiRegistration,
        title: 'OpenCTI Platform',
        contract: 'CE',
        subscription: {
          start_date: '2026-01-01T00:00:00.000Z',
          end_date: null,
        },
      },
    ]);

    const element = await PrivateHomepage();
    render(element);

    expect(mockRegisteredPlatformsFetcher).toHaveBeenCalledTimes(2);
    expect(mockServiceInstancesFetcher).toHaveBeenCalledTimes(1);
    expect(mockMeFirstNameFetcher).toHaveBeenCalled();
    expect(mockXtmPlatform).not.toHaveBeenCalled();

    expect(mockRegisteredPlatformsFetcher.mock.calls[0]?.[1]).toEqual({
      input: {
        identifier: null,
        onlyActive: true,
        onlyTrial: null,
        hasDeployedResources: null,
      },
    });

    expect(mockRegisteredPlatformsSection).toHaveBeenCalledWith(
      expect.objectContaining({
        welcomeName: undefined,
        registeredPlatformsData: expect.objectContaining({
          registeredPlatforms: expect.arrayContaining([
            expect.objectContaining({ id: '1' }),
          ]),
        }),
      }),
      undefined
    );

    expect(mockPrivateHomepageRoadmapSection).toHaveBeenCalledWith(
      expect.objectContaining({
        platformIdentifiers: [PlatformIdentifier.Opencti],
      }),
      undefined
    );

    expect(mockNewestResources).toHaveBeenCalledWith(
      expect.objectContaining({
        platformIdentifiers: [PlatformIdentifier.Opencti],
      }),
      undefined
    );
    expect(mockMostDeployedResources).toHaveBeenCalledWith(
      expect.objectContaining({
        platformIdentifiers: [PlatformIdentifier.Opencti],
      }),
      undefined
    );

    expect(screen.getByTestId('registered-platforms-section')).toBeTruthy();
  });

  it('passes both platformIdentifiers when both products are registered', async () => {
    mockRegisteredPlatformsResponses([
      {
        id: '1',
        identifier: ServiceDefinitionIdentifier.OpenctiRegistration,
        title: 'OpenCTI Platform',
        contract: 'CE',
        subscription: {
          start_date: '2026-01-01T00:00:00.000Z',
          end_date: null,
        },
      },
      {
        id: '2',
        identifier: ServiceDefinitionIdentifier.OpenaevRegistration,
        title: 'OpenAEV Platform',
        contract: 'EE',
        subscription: {
          start_date: '2026-01-01T00:00:00.000Z',
          end_date: null,
        },
      },
    ]);

    const element = await PrivateHomepage();
    render(element);

    expect(mockRegisteredPlatformsFetcher).toHaveBeenCalledTimes(2);
    expect(mockServiceInstancesFetcher).toHaveBeenCalledTimes(1);
    expect(mockMeFirstNameFetcher).toHaveBeenCalled();
    expect(mockXtmPlatform).not.toHaveBeenCalled();

    expect(mockRegisteredPlatformsSection).toHaveBeenCalledWith(
      expect.objectContaining({
        welcomeName: undefined,
      }),
      undefined
    );

    expect(mockPrivateHomepageRoadmapSection).toHaveBeenCalledWith(
      expect.objectContaining({
        platformIdentifiers: [
          PlatformIdentifier.Opencti,
          PlatformIdentifier.Openaev,
        ],
      }),
      undefined
    );

    expect(mockNewestResources).toHaveBeenCalledWith(
      expect.objectContaining({
        platformIdentifiers: [
          PlatformIdentifier.Opencti,
          PlatformIdentifier.Openaev,
        ],
      }),
      undefined
    );
    expect(mockMostDeployedResources).toHaveBeenCalledWith(
      expect.objectContaining({
        platformIdentifiers: [
          PlatformIdentifier.Opencti,
          PlatformIdentifier.Openaev,
        ],
      }),
      undefined
    );
  });

  it('renders XtmPlatform when no platforms are registered', async () => {
    mockRegisteredPlatformsResponses([]);

    const element = await PrivateHomepage();
    render(element);

    expect(mockRegisteredPlatformsFetcher).toHaveBeenCalledTimes(2);
    expect(mockServiceInstancesFetcher).toHaveBeenCalledTimes(1);
    expect(mockMeFirstNameFetcher).toHaveBeenCalled();
    expect(mockXtmPlatform).toHaveBeenCalledWith(
      expect.objectContaining({ welcomeName: undefined }),
      undefined
    );
    expect(mockRegisteredPlatformsSection).not.toHaveBeenCalled();
    expect(mockPrivateHomepageRoadmapSection).toHaveBeenCalledWith(
      expect.objectContaining({
        platformIdentifiers: [],
      }),
      undefined
    );
    expect(mockNewestResources).toHaveBeenCalledWith(
      expect.objectContaining({ platformIdentifiers: [] }),
      undefined
    );
    expect(mockMostDeployedResources).toHaveBeenCalledWith(
      expect.objectContaining({ platformIdentifiers: [] }),
      undefined
    );
  });

  it('passes personalized welcome name when me has a first name', async () => {
    mockRegisteredPlatformsResponses([]);
    mockMeFirstNameResponse('Jane');

    render(await PrivateHomepage());

    expect(mockXtmPlatform).toHaveBeenCalledWith(
      expect.objectContaining({ welcomeName: 'Jane' }),
      undefined
    );
  });

  it('falls back to default XtmPlatform label when me has no first name', async () => {
    mockRegisteredPlatformsResponses([]);
    mockMeFirstNameResponse(' ');

    render(await PrivateHomepage());

    expect(mockXtmPlatform).toHaveBeenCalledWith(
      expect.objectContaining({ welcomeName: undefined }),
      undefined
    );
  });

  it('renders roadmap section', async () => {
    mockRegisteredPlatformsResponses([]);

    render(await PrivateHomepage());

    expect(mockPrivateHomepageRoadmapSection).toHaveBeenCalledWith(
      expect.objectContaining({
        platformIdentifiers: [],
      }),
      undefined
    );
    expect(screen.getByTestId('private-homepage-roadmap-section')).toBeTruthy();
  });

  it('should query only the roadmap service instance along with the other homepage data', async () => {
    // Given
    mockRegisteredPlatformsResponses([]);

    // When
    await PrivateHomepage();

    // Then
    expect(mockServiceInstancesFetcher.mock.calls[0]?.[1]).toEqual({
      count: 1,
      orderBy: 'name',
      orderMode: 'asc',
      filters: [
        {
          key: 'service_definition_identifier',
          value: [ServiceDefinitionIdentifier.XtmPlatformRoadmap],
        },
      ],
      searchTerm: null,
    });
  });

  it('should pass the roadmap service instance id to the roadmap section', async () => {
    // Given
    mockRegisteredPlatformsResponses([]);
    mockServiceInstancesFetcher.mockReturnValue(() =>
      Promise.resolve({
        serviceInstances: {
          edges: [{ node: { id: ROADMAP_SERVICE_INSTANCE_ID } }],
        },
      })
    );

    // When
    render(await PrivateHomepage());

    // Then
    expect(mockPrivateHomepageRoadmapSection).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceInstanceId: ROADMAP_SERVICE_INSTANCE_ID,
      }),
      undefined
    );
  });
});
