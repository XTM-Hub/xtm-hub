import {
  PlatformIdentifier,
  ServiceDefinitionIdentifier,
} from '@graphql/generated';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockServerFetchGraphQL, mockXtmRoadmap } = vi.hoisted(() => ({
  mockServerFetchGraphQL: vi.fn(),
  mockXtmRoadmap: vi.fn(),
}));

vi.mock('@/relay/server-portal-api-fetch', () => ({
  serverFetchGraphQL: mockServerFetchGraphQL,
}));

vi.mock('@/components/homepage/roadmap/XtmRoadmap', () => ({
  default: mockXtmRoadmap,
}));

import PrivateHomepageRoadmapSection from './PrivateHomepageRoadmapSection';

describe('PrivateHomepageRoadmapSection', () => {
  beforeEach(() => {
    mockServerFetchGraphQL.mockReset();
    mockXtmRoadmap.mockReset();
    mockXtmRoadmap.mockReturnValue(<div data-testid="xtm-roadmap" />);
  });

  it('passes OCTI product filter when only OCTI is active', async () => {
    mockServerFetchGraphQL.mockResolvedValue({
      data: {
        serviceInstances: {
          edges: [{ node: { id: 'roadmap-1' } }],
        },
      },
    });

    render(
      await PrivateHomepageRoadmapSection({
        platformIdentifiers: [PlatformIdentifier.Opencti],
      })
    );

    expect(mockXtmRoadmap).toHaveBeenCalledWith(
      expect.objectContaining({
        seeMoreHref:
          '/app/service/xtm_platform_roadmap/roadmap-1?products=opencti',
        titleProduct: 'opencti',
      }),
      undefined
    );
  });

  it('passes OAEV product filter when only OAEV is active', async () => {
    mockServerFetchGraphQL.mockResolvedValue({
      data: {
        serviceInstances: {
          edges: [{ node: { id: 'roadmap-2' } }],
        },
      },
    });

    render(
      await PrivateHomepageRoadmapSection({
        platformIdentifiers: [PlatformIdentifier.Openaev],
      })
    );

    expect(mockXtmRoadmap).toHaveBeenCalledWith(
      expect.objectContaining({
        seeMoreHref:
          '/app/service/xtm_platform_roadmap/roadmap-2?products=openaev',
        titleProduct: 'openaev',
      }),
      undefined
    );
  });

  it('uses full roadmap when both platforms are active', async () => {
    mockServerFetchGraphQL.mockResolvedValue({
      data: {
        serviceInstances: {
          edges: [{ node: { id: 'roadmap-3' } }],
        },
      },
    });

    render(
      await PrivateHomepageRoadmapSection({
        platformIdentifiers: [
          PlatformIdentifier.Opencti,
          PlatformIdentifier.Openaev,
        ],
      })
    );

    expect(mockXtmRoadmap).toHaveBeenCalledWith(
      expect.objectContaining({
        seeMoreHref: '/app/service/xtm_platform_roadmap/roadmap-3',
        titleProduct: 'default',
      }),
      undefined
    );
  });

  it('uses full roadmap when no active platform is registered', async () => {
    mockServerFetchGraphQL.mockResolvedValue({
      data: {
        serviceInstances: {
          edges: [{ node: { id: 'roadmap-0' } }],
        },
      },
    });

    render(
      await PrivateHomepageRoadmapSection({
        platformIdentifiers: [],
      })
    );

    expect(mockXtmRoadmap).toHaveBeenCalledWith(
      expect.objectContaining({
        seeMoreHref: '/app/service/xtm_platform_roadmap/roadmap-0',
        titleProduct: 'default',
      }),
      undefined
    );
  });

  it('returns null when no roadmap service instance exists', async () => {
    mockServerFetchGraphQL.mockResolvedValue({
      data: {
        serviceInstances: {
          edges: [],
        },
      },
    });

    const result = await PrivateHomepageRoadmapSection({
      platformIdentifiers: [],
    });

    expect(result).toBeNull();
    expect(mockXtmRoadmap).not.toHaveBeenCalled();
  });

  it('queries roadmap service instances by identifier', async () => {
    mockServerFetchGraphQL.mockResolvedValue({
      data: {
        serviceInstances: {
          edges: [{ node: { id: 'roadmap-4' } }],
        },
      },
    });

    await PrivateHomepageRoadmapSection({
      platformIdentifiers: [],
    });

    expect(mockServerFetchGraphQL).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        count: 1,
        filters: [
          {
            key: 'service_definition_identifier',
            value: [ServiceDefinitionIdentifier.XtmPlatformRoadmap],
          },
        ],
      })
    );
  });
});
