import { StartTrialButton } from '@/components/service/trial-instances/StartTrialButton';
import testRender from '@/utils/test/test-render';
import {
  DeploymentRequestSource,
  DeploymentRequestUseCase,
  PlatformIdentifier,
} from '@graphql/generated';
import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  commitCreateDeploymentRequest: vi.fn(),
  useOrgaFreeTrial: vi.fn(),
}));

vi.mock('react-relay', () => ({
  useMutation: () => [mocks.commitCreateDeploymentRequest],
  useRelayEnvironment: () => ({}),
  loadQuery: vi.fn(() => ({})),
  fetchQuery: vi.fn(() => ({ subscribe: vi.fn() })),
}));

vi.mock('@/components/service/trial-instances/useOrgaFreeTrials', () => ({
  useOrgaFreeTrial: mocks.useOrgaFreeTrial,
}));

vi.mock(
  '@/components/menu/navigation/private/private-navigation-query-invalidation',
  () => ({
    invalidatePrivateNavigationQueries: vi.fn(),
  })
);

let capturedHandleSubmit:
  | ((values: {
      region: string;
      job_title: string;
      activity_sector: string;
      acceptTerms: boolean;
      use_case: DeploymentRequestUseCase;
    }) => void)
  | undefined;

vi.mock('@/components/service/trial-instances/TryFiligranProductForm', () => ({
  TryFiligranProductForm: ({
    handleSubmit,
  }: {
    handleSubmit: typeof capturedHandleSubmit;
  }) => {
    capturedHandleSubmit = handleSubmit;
    return <div data-testid="try-form" />;
  },
  tryFiligranProductFormSchema: {},
}));

describe('StartTrialButton', () => {
  beforeEach(() => {
    mocks.commitCreateDeploymentRequest.mockReset();
    mocks.useOrgaFreeTrial.mockReset();
    mocks.useOrgaFreeTrial.mockReturnValue({
      availableTrials: [PlatformIdentifier.Opencti],
      isBlacklisted: false,
      refetch: vi.fn(),
    });
    capturedHandleSubmit = undefined;
  });

  it('submits a trial deployment request with the product wrapped in use_cases_by_product', () => {
    testRender(
      <StartTrialButton
        openForm
        platformIdentifier={PlatformIdentifier.Opencti}
        source={DeploymentRequestSource.Xtmhub}
      />
    );

    act(() => {
      capturedHandleSubmit?.({
        region: 'eu',
        job_title: 'CISO',
        activity_sector: 'IT',
        acceptTerms: true,
        use_case: DeploymentRequestUseCase.ThreatHunting,
      });
    });

    expect(mocks.commitCreateDeploymentRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: {
          input: {
            region: 'eu',
            job_title: 'CISO',
            activity_sector: 'IT',
            products: [PlatformIdentifier.Opencti],
            use_cases_by_product: [
              {
                platform_identifier: PlatformIdentifier.Opencti,
                use_case: DeploymentRequestUseCase.ThreatHunting,
              },
            ],
            source: DeploymentRequestSource.Xtmhub,
          },
        },
      })
    );
  });
});
