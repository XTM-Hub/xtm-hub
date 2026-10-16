import { Parameters } from '@/components/admin/parameters/Parameters';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const APP_VERSION = '2.4.1';
const DEFAULT_VERSION = '0.0.0-dev';

describe('Parameters', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should display the version of the running application', () => {
    // Given
    vi.stubEnv('NEXT_PUBLIC_APP_VERSION', APP_VERSION);

    // When
    testRender(<Parameters />);

    // Then
    expect(screen.getByText('Parameters.Version')).toBeInTheDocument();
    expect(screen.getByText(APP_VERSION)).toBeInTheDocument();
  });

  it('should display a development version when the application version is not defined', () => {
    // Given
    vi.stubEnv('NEXT_PUBLIC_APP_VERSION', '');

    // When
    testRender(<Parameters />);

    // Then
    expect(screen.getByText(DEFAULT_VERSION)).toBeInTheDocument();
  });
});
