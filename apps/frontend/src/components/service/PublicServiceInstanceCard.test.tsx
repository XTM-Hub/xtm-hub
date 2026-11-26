import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PublicServiceInstanceCard from './PublicServiceInstanceCard';
import type { ServiceInstanceCardData } from './ServiceInstanceCard';

const buildServiceInstance = (
  overrides: Partial<ServiceInstanceCardData> = {}
): ServiceInstanceCardData => ({
  id: 'service-instance-id',
  name: 'OpenCTI',
  logoBackgroundImageUrl: null,
  illustrationDocumentUrl: null,
  url: '/internal/platform',
  ...overrides,
});

describe('PublicServiceInstanceCard', () => {
  it('prefixes internal link with current locale', () => {
    const serviceInstance = buildServiceInstance({ url: '/internal/platform' });

    testRender(<PublicServiceInstanceCard serviceInstance={serviceInstance} />);

    const titleLink = screen.getByRole('link', { name: 'OpenCTI' });
    expect(titleLink).toHaveAttribute('href', '/en/internal/platform');
    expect(titleLink).toHaveAttribute('target', '_self');
  });

  it('prefixes path without language segment', () => {
    const serviceInstance = buildServiceInstance({ url: 'internal/platform' });

    testRender(<PublicServiceInstanceCard serviceInstance={serviceInstance} />);

    const titleLink = screen.getByRole('link', { name: 'OpenCTI' });
    expect(titleLink).toHaveAttribute('href', '/en/internal/platform');
    expect(titleLink).toHaveAttribute('target', '_self');
  });

  it('does not prefix external link', () => {
    const serviceInstance = buildServiceInstance({
      url: 'https://filigran.io',
    });

    testRender(<PublicServiceInstanceCard serviceInstance={serviceInstance} />);

    const titleLink = screen.getByRole('link', { name: 'OpenCTI' });
    expect(titleLink).toHaveAttribute('href', 'https://filigran.io');
    expect(titleLink).toHaveAttribute('target', '_blank');
  });
});
