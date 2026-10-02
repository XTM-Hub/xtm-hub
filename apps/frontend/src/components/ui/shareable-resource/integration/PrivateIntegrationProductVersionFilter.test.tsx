import { useRegisteredPlatforms } from '@/hooks/use-registered-platforms';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrivateIntegrationProductVersionFilter } from './PrivateIntegrationProductVersionFilter';

const integrationProductVersionFilterMock = vi.fn();

vi.mock('./IntegrationProductVersionFilter', () => ({
  IntegrationProductVersionFilter: (...args: unknown[]) => {
    integrationProductVersionFilterMock(...args);
    return <div data-testid="integration-product-version-filter" />;
  },
}));

describe('PrivateIntegrationProductVersionFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forwards the deduped, truthy registered platform versions to IntegrationProductVersionFilter', () => {
    vi.mocked(useRegisteredPlatforms).mockReturnValue({
      platforms: [
        { version: '6.5.0' },
        { version: '6.5.0' },
        { version: '6.6.0' },
        { version: undefined },
        { version: '' },
      ],
    });

    testRender(<PrivateIntegrationProductVersionFilter />);

    expect(
      screen.getByTestId('integration-product-version-filter')
    ).toBeInTheDocument();
    expect(integrationProductVersionFilterMock).toHaveBeenCalledOnce();
    expect(integrationProductVersionFilterMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({ registeredVersions: ['6.5.0', '6.6.0'] })
    );
  });

  it('calls useRegisteredPlatforms for the OpenCTI platform, restricted to active instances', () => {
    vi.mocked(useRegisteredPlatforms).mockReturnValue({ platforms: [] });

    testRender(<PrivateIntegrationProductVersionFilter />);

    expect(useRegisteredPlatforms).toHaveBeenCalledWith('opencti', {
      onlyActive: true,
    });
  });
});
