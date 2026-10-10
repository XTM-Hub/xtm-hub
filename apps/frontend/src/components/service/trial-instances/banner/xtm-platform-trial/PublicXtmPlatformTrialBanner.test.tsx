import { PublicXtmPlatformTrialBanner } from '@/components/service/trial-instances/banner/xtm-platform-trial/PublicXtmPlatformTrialBanner';
import testRender from '@/utils/test/test-render';
import { SnackbarProvider, SnackbarViewport } from '@filigran/design-system';
import { afterEach, describe, expect, it } from 'vitest';

describe('PublicXtmPlatformTrialBanner', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('should always render the no-trial banner without running any query', async () => {
    const { findByText } = testRender(
      <SnackbarProvider>
        <PublicXtmPlatformTrialBanner />
        <SnackbarViewport />
      </SnackbarProvider>
    );

    expect(
      await findByText('Service.Trials.XtmPlatform.NoTrial.Text')
    ).toBeInTheDocument();
  });
});
