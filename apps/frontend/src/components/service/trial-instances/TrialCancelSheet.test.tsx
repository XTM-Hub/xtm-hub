import testRender from '@/utils/test/test-render';
import * as FiligranUI from '@filigran/ui';
import { PlatformIdentifier } from '@graphql/generated';
import { registeredPlatformsKeys } from '@graphql/registered-platforms/registered-platforms.keys';
import { serviceInstancesKeys } from '@graphql/service-instances/service-instances.keys';
import { trialKeys } from '@graphql/trial/trial.keys';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { createMockEnvironment } from 'relay-test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TrialCancelSheet } from './TrialCancelSheet';

const testState = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  lastCancelDeploymentRequestVariables: null as Record<string, unknown> | null,
  mutationMode: 'success' as 'success' | 'error',
}));

vi.mock('@/components/service/trial-instances/useOrgaFreeTrials', () => ({
  useOrgaFreeTrial: () => ({ refetch: vi.fn() }),
}));
vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal()),
  useQueryClient: () => ({
    invalidateQueries: testState.invalidateQueries,
  }),
}));
vi.mock('@/components/ui/SheetWithPreventingDialog', () => ({
  SheetWithPreventingDialog: ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title: string;
  }) => (
    <div>
      <h2>{title}</h2>
      {children}
    </div>
  ),
}));
vi.mock('@/components/service/registration/SelectWithEditableField', () => ({
  SelectWithEditableField: ({
    onChange,
  }: {
    onChange: (value: string) => void;
  }) => (
    <button
      type="button"
      data-testid="select-reason"
      onClick={() => onChange('value')}>
      select-reason
    </button>
  ),
}));
vi.mock('react-relay', async (importOriginal) => ({
  ...(await importOriginal()),
  useMutation: () => [
    (opts: {
      variables: Record<string, unknown>;
      onCompleted?: (data: unknown) => void;
      onError?: (err: Error) => void;
    }) => {
      testState.lastCancelDeploymentRequestVariables = opts.variables;
      if (testState.mutationMode === 'error') {
        opts.onError?.(new Error('Some error'));
        return;
      }
      opts.onCompleted?.({
        cancelDeploymentRequest: { counts_in_orga_quota: false },
      });
    },
    {},
  ],
}));
describe('TrialCancelSheet', () => {
  beforeEach(() => {
    testState.invalidateQueries.mockReset();
    testState.lastCancelDeploymentRequestVariables = null;
    testState.mutationMode = 'success';
    vi.spyOn(FiligranUI, 'toast').mockImplementation(() => undefined);
  });

  it('should render and submit cancellation reason', async () => {
    const environment = createMockEnvironment();
    const setOpen = vi.fn();
    testRender(
      <TrialCancelSheet
        deploymentRequestId="test-id"
        isCancellationDefinitive={false}
        open
        setOpen={setOpen}
        platformIdentifier={PlatformIdentifier.Opencti}
      />,
      { relayConfig: environment }
    );
    fireEvent.click(screen.getByTestId('select-reason'));
    fireEvent.click(screen.getByRole('button', { name: 'Utils.Continue' }));

    await waitFor(() => {
      expect(setOpen).toHaveBeenCalledWith(false);
    });
    expect(testState.lastCancelDeploymentRequestVariables).toEqual({
      deploymentRequestId: 'test-id',
      cancellationReason: 'value',
    });
    expect(testState.invalidateQueries).toHaveBeenCalledWith({
      queryKey: serviceInstancesKeys.all(),
    });
    expect(testState.invalidateQueries).toHaveBeenCalledWith({
      queryKey: registeredPlatformsKeys.all(),
    });
    expect(testState.invalidateQueries).toHaveBeenCalledWith({
      queryKey: trialKeys.trialDeploymentsEligibilityAll(),
    });
  });

  it('should not submit when no cancellation reason is selected', async () => {
    const setOpen = vi.fn();
    testRender(
      <TrialCancelSheet
        deploymentRequestId="test-id"
        isCancellationDefinitive={false}
        open
        setOpen={setOpen}
        platformIdentifier={PlatformIdentifier.Opencti}
      />,
      { relayConfig: createMockEnvironment() }
    );
    fireEvent.click(screen.getByRole('button', { name: 'Utils.Continue' }));

    await waitFor(() => {
      expect(screen.getByTestId('select-reason')).toBeInTheDocument();
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(testState.lastCancelDeploymentRequestVariables).toBeNull();
    expect(setOpen).not.toHaveBeenCalled();
  });

  it('should show warning if cancellation is definitive', () => {
    testRender(
      <TrialCancelSheet
        deploymentRequestId="id"
        isCancellationDefinitive
        open
        setOpen={vi.fn()}
        platformIdentifier={PlatformIdentifier.Opencti}
      />,
      { relayConfig: createMockEnvironment() }
    );
    expect(
      screen.getByText(
        'Service.Trials.Cancellation.ConfirmationForm.NoNewTrialPossible'
      )
    ).toBeInTheDocument();
  });

  it('should call setOpen(false) when cancel button is clicked', () => {
    const setOpen = vi.fn();
    testRender(
      <TrialCancelSheet
        deploymentRequestId="id"
        isCancellationDefinitive={false}
        open
        setOpen={setOpen}
        platformIdentifier={PlatformIdentifier.Opencti}
      />,
      { relayConfig: createMockEnvironment() }
    );
    fireEvent.click(screen.getByRole('button', { name: 'Utils.Cancel' }));
    expect(setOpen).toHaveBeenCalledWith(false);
  });

  it('should show error toast on mutation error', async () => {
    testState.mutationMode = 'error';
    testRender(
      <TrialCancelSheet
        deploymentRequestId="id"
        isCancellationDefinitive={false}
        open
        setOpen={vi.fn()}
        platformIdentifier={PlatformIdentifier.Opencti}
      />,
      { relayConfig: createMockEnvironment() }
    );
    fireEvent.click(screen.getByTestId('select-reason'));
    fireEvent.click(screen.getByRole('button', { name: 'Utils.Continue' }));

    await waitFor(() => {
      expect(FiligranUI.toast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Utils.Error',
        description: 'Error.Server.Some error',
      });
    });
  });
});
