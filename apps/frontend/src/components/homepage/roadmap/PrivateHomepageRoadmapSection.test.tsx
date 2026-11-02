import { PlatformIdentifier } from '@graphql/generated';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockXtmRoadmap } = vi.hoisted(() => ({
  mockXtmRoadmap: vi.fn(),
}));

vi.mock('@/components/homepage/roadmap/XtmRoadmap', () => ({
  default: mockXtmRoadmap,
}));

import PrivateHomepageRoadmapSection from './PrivateHomepageRoadmapSection';

describe('PrivateHomepageRoadmapSection', () => {
  beforeEach(() => {
    mockXtmRoadmap.mockReset();
    mockXtmRoadmap.mockReturnValue(<div data-testid="xtm-roadmap" />);
  });

  it('passes OCTI product filter when only OCTI is active', () => {
    const serviceInstanceId = 'roadmap-1';

    render(
      <PrivateHomepageRoadmapSection
        serviceInstanceId={serviceInstanceId}
        platformIdentifiers={[PlatformIdentifier.Opencti]}
      />
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

  it('passes OAEV product filter when only OAEV is active', () => {
    const serviceInstanceId = 'roadmap-2';

    render(
      <PrivateHomepageRoadmapSection
        serviceInstanceId={serviceInstanceId}
        platformIdentifiers={[PlatformIdentifier.Openaev]}
      />
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

  it('uses full roadmap when both platforms are active', () => {
    const serviceInstanceId = 'roadmap-3';

    render(
      <PrivateHomepageRoadmapSection
        serviceInstanceId={serviceInstanceId}
        platformIdentifiers={[
          PlatformIdentifier.Opencti,
          PlatformIdentifier.Openaev,
        ]}
      />
    );

    expect(mockXtmRoadmap).toHaveBeenCalledWith(
      expect.objectContaining({
        seeMoreHref: '/app/service/xtm_platform_roadmap/roadmap-3',
        titleProduct: 'default',
      }),
      undefined
    );
  });

  it('uses full roadmap when no active platform is registered', () => {
    const serviceInstanceId = 'roadmap-0';

    render(
      <PrivateHomepageRoadmapSection
        serviceInstanceId={serviceInstanceId}
        platformIdentifiers={[]}
      />
    );

    expect(mockXtmRoadmap).toHaveBeenCalledWith(
      expect.objectContaining({
        seeMoreHref: '/app/service/xtm_platform_roadmap/roadmap-0',
        titleProduct: 'default',
      }),
      undefined
    );
  });

  it('returns null when no roadmap service instance exists', () => {
    const result = PrivateHomepageRoadmapSection({
      serviceInstanceId: undefined,
      platformIdentifiers: [],
    });

    expect(result).toBeNull();
    expect(mockXtmRoadmap).not.toHaveBeenCalled();
  });
});
