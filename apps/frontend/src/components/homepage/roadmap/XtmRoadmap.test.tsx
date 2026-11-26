import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockServerGraphqlFetch, mockGetTranslations } = vi.hoisted(() => ({
  mockServerGraphqlFetch: vi.fn(),
  mockGetTranslations: vi.fn(),
}));

vi.mock('@/lib/server-graphql-fetch', () => ({
  serverGraphqlFetch: mockServerGraphqlFetch,
}));

vi.mock('next-intl/server', () => ({
  getTranslations: mockGetTranslations,
  getLocale: vi.fn().mockResolvedValue('en'),
}));

import XtmRoadmap from './XtmRoadmap';

describe('XtmRoadmap', () => {
  beforeEach(() => {
    mockServerGraphqlFetch.mockReset();
    mockGetTranslations.mockReset();

    mockGetTranslations.mockImplementation(async (namespace: string) => {
      if (namespace === 'PublicHomePage.XtmRoadmap') {
        return (key: string, values?: { product?: string }) => {
          if (key === 'Title') {
            return 'Title';
          }

          if (key === 'TitleWithProduct') {
            return `TitleWithProduct-${values?.product ?? 'missing'}`;
          }

          return key;
        };
      }

      if (namespace === 'PlatformIdentifier') {
        return (key: string) => {
          if (key === 'opencti') {
            return 'OpenCTI';
          }

          if (key === 'openaev') {
            return 'OpenAEV';
          }

          return key;
        };
      }

      return (key: string) => key;
    });

    mockServerGraphqlFetch.mockResolvedValue({
      countEpicsPerTimeline: [],
    });
  });

  it('uses public roadmap url by default', async () => {
    render(await XtmRoadmap({}));

    expect(screen.getByRole('link', { name: 'SeeMore' })).toHaveAttribute(
      'href',
      '/en/cybersecurity-solutions/xtm-platform-roadmap'
    );
  });

  it('uses custom roadmap href when provided', async () => {
    render(
      await XtmRoadmap({
        seeMoreHref:
          '/app/service/xtm_platform_roadmap/instance-1?products=opencti',
      })
    );

    expect(screen.getByRole('link', { name: 'SeeMore' })).toHaveAttribute(
      'href',
      '/app/service/xtm_platform_roadmap/instance-1?products=opencti'
    );
  });

  it('uses default title when no titleProduct is provided', async () => {
    render(await XtmRoadmap({}));

    expect(
      screen.getByRole('heading', { level: 2, name: 'Title' })
    ).toBeInTheDocument();
  });

  it('uses product title when titleProduct is provided', async () => {
    render(
      await XtmRoadmap({
        titleProduct: 'opencti',
      })
    );

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'TitleWithProduct-OpenCTI',
      })
    ).toBeInTheDocument();
  });
});
