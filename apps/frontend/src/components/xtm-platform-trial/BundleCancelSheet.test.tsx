'use client';

import testRender from '@/utils/test/test-render';
import * as FiligranUI from '@filigran/ui';
import { xtmPlatformBundleKeys } from '@graphql/deployment/deployment.keys';
import { registeredPlatformsKeys } from '@graphql/registered-platforms/registered-platforms.keys';
import { serviceInstancesKeys } from '@graphql/service-instances/service-instances.keys';
import { trialKeys } from '@graphql/trial/trial.keys';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BundleCancelSheet } from './BundleCancelSheet';

const bundleDeploymentRequestId = 'bundle-deployment-request-id';
const selectedReason = 'value';

const testState = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  lastCancelDeploymentRequestVariables: null as Record<string, unknown> | null,
  mutationMode: 'success' as 'success' | 'error',
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
      onClick={() => onChange(selectedReason)}>
      select-reason
    </button>
  ),
}));

vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal()),
  useQueryClient: () => ({
    invalidateQueries: testState.invalidateQueries,
  }),
}));

vi.mock('react-relay', async (importOriginal) => ({
  ...(await importOriginal()),
  useMutation: () => [
    (opts: {
      variables: Record<string, unknown>;
      onCompleted?: () => void;
      onError?: (err: Error) => void;
    }) => {
      testState.lastCancelDeploymentRequestVariables = opts.variables;
      if (testState.mutationMode === 'error') {
        opts.onError?.(new Error('Some error'));
        return;
      }
      opts.onCompleted?.();
    },
    {},
  ],
}));

describe('BundleCancelSheet', () => {
  beforeEach(() => {
    testState.invalidateQueries.mockReset();
    testState.lastCancelDeploymentRequestVariables = null;
    testState.mutationMode = 'success';
    vi.spyOn(FiligranUI, 'toast').mockImplementation(() => undefined);
  });

  it('should render the cancellation popup content when opened', () => {
    // Given
    testRender(
      <BundleCancelSheet
        deploymentRequestId={bundleDeploymentRequestId}
        open={true}
        setOpen={vi.fn()}
      />
    );

    // Then
    expect(
      screen.getByText('XtmPlatformTrial.CancelDialog.Title')
    ).toBeInTheDocument();
    expect(
      screen.getByText('XtmPlatformTrial.CancelDialog.Description')
    ).toBeInTheDocument();
    expect(
      screen.getByText('XtmPlatformTrial.CancelDialog.Warning')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Utils.Cancel' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Utils.Confirm' })
    ).toBeInTheDocument();
  });

  it('should disable confirm button when no cancellation reason is selected', () => {
    testRender(
      <BundleCancelSheet
        deploymentRequestId={bundleDeploymentRequestId}
        open={true}
        setOpen={vi.fn()}
      />
    );

    expect(
      screen.getByRole('button', { name: 'Utils.Confirm' })
    ).toBeDisabled();

    fireEvent.click(screen.getByTestId('select-reason'));

    expect(
      screen.getByRole('button', { name: 'Utils.Confirm' })
    ).not.toBeDisabled();
  });

  it('should submit the selected cancellation reason when the form is confirmed', async () => {
    const setOpen = vi.fn();

    // Given
    testRender(
      <BundleCancelSheet
        deploymentRequestId={bundleDeploymentRequestId}
        open={true}
        setOpen={setOpen}
      />
    );

    // When
    fireEvent.click(screen.getByTestId('select-reason'));
    fireEvent.click(screen.getByRole('button', { name: 'Utils.Confirm' }));

    // Then
    await waitFor(() => {
      expect(setOpen).toHaveBeenCalledWith(false);
    });
    expect(testState.lastCancelDeploymentRequestVariables).toEqual({
      deploymentRequestId: bundleDeploymentRequestId,
      cancellationReason: selectedReason,
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
    expect(testState.invalidateQueries).toHaveBeenCalledWith({
      queryKey: xtmPlatformBundleKeys.all(),
    });
  });

  it('should close the popup when the cancel button is clicked', () => {
    const setOpen = vi.fn();

    // Given
    testRender(
      <BundleCancelSheet
        deploymentRequestId={bundleDeploymentRequestId}
        open={true}
        setOpen={setOpen}
      />
    );

    // When
    fireEvent.click(screen.getByRole('button', { name: 'Utils.Cancel' }));

    // Then
    expect(setOpen).toHaveBeenCalledWith(false);
  });
});
