import EeLearnMoreSheet from '@/components/service/document/one-click-deploy/EeLearnMoreSheet';
import { readTrackedEvents, startAnalytics } from '@/utils/test/analytics';
import testRender from '@/utils/test/test-render';
import { PlatformIdentifier } from '@graphql/generated';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useReachSalesAboutPlatformMutation: vi.fn(),
  mutate: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useReachSalesAboutPlatformMutation: mocks.useReachSalesAboutPlatformMutation,
}));

const MESSAGE_LABEL =
  'Service.ShareableResources.Deploy.EELearnMore.InterestedTitle';
const SEND_LABEL = 'Service.ShareableResources.Deploy.EELearnMore.SendButton';

const renderSheet = () =>
  testRender(
    <EeLearnMoreSheet
      open
      setOpen={vi.fn()}
      platformIdentifier={PlatformIdentifier.Openaev}
    />
  );

describe('EeLearnMoreSheet', () => {
  beforeEach(() => {
    mocks.useReachSalesAboutPlatformMutation.mockReturnValue({
      mutate: mocks.mutate,
      isPending: false,
    });
    startAnalytics();
  });

  it('should send an Enterprise Edition contact lead for the platform product when the request succeeds', () => {
    // Given
    renderSheet();
    const [, options] = mocks.useReachSalesAboutPlatformMutation.mock.calls[0];

    // When
    options.onSuccess();

    // Then
    expect(readTrackedEvents('generate_lead')).toEqual([
      { lead_source: 'Enterprise Edition contact', product: 'OpenAEV' },
    ]);
  });

  it('should not send a lead when the request is submitted but has not succeeded', async () => {
    // Given
    const { user } = renderSheet();
    await user.type(
      screen.getByLabelText(MESSAGE_LABEL),
      'We would like a quote'
    );

    // When
    await user.click(screen.getByRole('button', { name: SEND_LABEL }));

    // Then
    await waitFor(() => expect(mocks.mutate).toHaveBeenCalled());
    expect(readTrackedEvents('generate_lead')).toEqual([]);
  });
});
