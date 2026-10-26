import { TestEnvBanner } from '@/components/admin/TestEnvBanner';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const TEST_ENV_BANNER_TEXT = 'TestEnvBanner';
const GO_TO_PROD_LABEL = 'GoToProd';
const PRODUCTION_URL = 'https://hub.filigran.io/';

describe('TestEnvBanner', () => {
  it.each(['local', 'staging'])(
    'should warn that this is not production and link to production when the platform runs in the %s environment',
    (environment) => {
      // Given / When
      testRender(<TestEnvBanner />, { settings: { environment } });

      // Then
      expect(screen.getByText(TEST_ENV_BANNER_TEXT)).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: GO_TO_PROD_LABEL })
      ).toHaveAttribute('href', PRODUCTION_URL);
    }
  );

  it('should not display the banner when the platform runs in production', () => {
    // Given / When
    testRender(<TestEnvBanner />, { settings: { environment: 'production' } });

    // Then
    expect(screen.queryByText(TEST_ENV_BANNER_TEXT)).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
