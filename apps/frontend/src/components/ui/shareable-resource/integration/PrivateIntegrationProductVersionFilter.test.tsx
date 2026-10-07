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

  it('forwards every instance name grouped by registered platform version to IntegrationProductVersionFilter', () => {
    vi.mocked(useRegisteredPlatforms).mockReturnValue({
      platforms: [
        { version: '6.5.0', title: 'Prod', url: 'https://prod' },
        { version: '6.5.0', title: 'Staging', url: 'https://staging' },
        { version: '6.6.0', title: '', url: 'https://dev' },
        { version: undefined, title: 'No version', url: 'https://none' },
        { version: '', title: 'Empty version', url: 'https://empty' },
      ],
    });

    testRender(<PrivateIntegrationProductVersionFilter />);

    expect(
      screen.getByTestId('integration-product-version-filter')
    ).toBeInTheDocument();
    expect(integrationProductVersionFilterMock).toHaveBeenCalledOnce();
    expect(integrationProductVersionFilterMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        registeredInstancesByVersion: {
          '6.5.0': ['Prod', 'Staging'],
          '6.6.0': ['https://dev'],
        },
      })
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
