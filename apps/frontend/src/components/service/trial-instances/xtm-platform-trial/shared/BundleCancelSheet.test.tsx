'use client';

import testRender from '@/utils/test/test-render';
import { xtmPlatformBundleKeys } from '@graphql/deployment/deployment.keys';
import { registeredPlatformsKeys } from '@graphql/registered-platforms/registered-platforms.keys';
import { serviceInstancesKeys } from '@graphql/service-instances/service-instances.keys';
import { platformTrialKeys } from '@graphql/trial/trial.keys';
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

const showSnackbarMock = vi.hoisted(() => vi.fn());

vi.mock('@/components/ui/snackbar/snackbar-store', () => ({
  showSnackbar: showSnackbarMock,
}));

const reasonFieldMounts = vi.hoisted(() => ({ count: 0 }));

vi.mock(
  '@/components/service/registration/SelectWithEditableField',
  async () => {
    const { useEffect } = await import('react');
    return {
      SelectWithEditableField: ({
        onChange,
      }: {
        onChange: (value: string) => void;
      }) => {
        useEffect(() => {
          reasonFieldMounts.count += 1;
        }, []);
        return (
          <button
            type="button"
            data-testid="select-reason"
            onClick={() => onChange(selectedReason)}>
            select-reason
          </button>
        );
      },
    };
  }
);

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
    showSnackbarMock.mockReset();
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

  it('should keep the reason field mounted when the reason changes', () => {
    // Given
    testRender(
      <BundleCancelSheet
        deploymentRequestId={bundleDeploymentRequestId}
        open={true}
        setOpen={vi.fn()}
      />
    );
    const mountsBeforeChange = reasonFieldMounts.count;

    // When
    fireEvent.click(screen.getByTestId('select-reason'));

    // Then
    expect(reasonFieldMounts.count).toBe(mountsBeforeChange);
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
      queryKey: platformTrialKeys.platformTrialStatusAll(),
    });
    expect(testState.invalidateQueries).toHaveBeenCalledWith({
      queryKey: xtmPlatformBundleKeys.all(),
    });
  });

  it('should show a destructive toast and keep the popup open when the cancellation mutation fails', async () => {
    const setOpen = vi.fn();
    testState.mutationMode = 'error';

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
      expect(showSnackbarMock).toHaveBeenCalledWith({
        severity: 'error',
        title: 'Utils.Error',
        description: 'Error.Server.Some error',
      });
    });
    expect(setOpen).not.toHaveBeenCalledWith(false);
    expect(testState.invalidateQueries).not.toHaveBeenCalled();
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
