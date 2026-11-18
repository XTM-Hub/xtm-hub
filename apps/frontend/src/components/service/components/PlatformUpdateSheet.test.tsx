import { PlatformUpdateSheet } from '@/components/service/components/PlatformUpdateSheet';
import testRender from '@/utils/test/test-render';
import {
  ServiceDefinitionIdentifier,
  UpdatePlatformServiceMetadataMutationVariables,
} from '@graphql/generated';
import { registrationKeys } from '@graphql/registration/registration.keys';
import { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  updatePlatformMetadata: vi.fn(),
  invalidatePrivateNavigationQueries: vi.fn(),
  showSnackbar: vi.fn(),
}));

vi.mock(
  '@/components/menu/navigation/private/private-navigation-query-invalidation',
  () => ({
    invalidatePrivateNavigationQueries:
      testState.invalidatePrivateNavigationQueries,
  })
);

vi.mock('@/components/ui/snackbar/snackbar-store', () => ({
  showSnackbar: testState.showSnackbar,
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

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  const { useMutation } = await import('@tanstack/react-query');
  return mockGeneratedQueryHooks(importOriginal, {
    // The real react-query lifecycle around a mocked request, so a test can
    // hold the request and unmount the sheet before it settles.
    useUpdatePlatformServiceMetadataMutation: (
      _client: unknown,
      options?: UseMutationOptions<
        unknown,
        Error,
        UpdatePlatformServiceMetadataMutationVariables
      >
    ) =>
      useMutation({
        ...options,
        mutationFn: (variables) => testState.updatePlatformMetadata(variables),
      }),
  });
});

describe('PlatformUpdateSheet', () => {
  const defaultProps = {
    serviceInstanceId: 'service-instance-id',
    serviceInstanceName: 'OpenCTI Platform',
    platformUrl: 'https://platform.example.com',
    serviceDefinitionIdentifier:
      ServiceDefinitionIdentifier.OpenctiRegistration,
    open: true,
    setOpen: vi.fn(),
  };

  beforeEach(() => {
    testState.updatePlatformMetadata.mockReset();
    testState.invalidatePrivateNavigationQueries.mockReset();
    testState.showSnackbar.mockReset();
    testState.updatePlatformMetadata.mockResolvedValue({});
  });

  it('displays URL input with the provided URL', () => {
    testRender(<PlatformUpdateSheet {...defaultProps} />);

    expect(
      screen.getByDisplayValue('https://platform.example.com')
    ).toBeInTheDocument();
  });

  it('renders URL input as non-editable', () => {
    testRender(<PlatformUpdateSheet {...defaultProps} />);

    expect(screen.getByDisplayValue(defaultProps.platformUrl)).toBeDisabled();
  });

  it('submits only serviceInstanceId and name in mutation input', async () => {
    const { user } = testRender(<PlatformUpdateSheet {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Utils.Update' }));

    await waitFor(() =>
      expect(testState.updatePlatformMetadata).toHaveBeenCalledOnce()
    );
    expect(testState.updatePlatformMetadata.mock.calls[0][0]).toStrictEqual({
      input: {
        serviceInstanceId: defaultProps.serviceInstanceId,
        name: defaultProps.serviceInstanceName,
      },
    });
  });

  it('closes the sheet and confirms the update after a successful update', async () => {
    // Given
    const setOpen = vi.fn();
    const { user } = testRender(
      <PlatformUpdateSheet
        {...defaultProps}
        setOpen={setOpen}
      />
    );

    // When
    await user.click(screen.getByRole('button', { name: 'Utils.Update' }));

    // Then
    await waitFor(() => expect(setOpen).toHaveBeenCalledWith(false));
    expect(testState.showSnackbar).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success' })
    );
  });

  it('invalidates the private navigation queries after a successful update', async () => {
    const { user } = testRender(<PlatformUpdateSheet {...defaultProps} />);

    expect(testState.invalidatePrivateNavigationQueries).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Utils.Update' }));

    await waitFor(() =>
      expect(
        testState.invalidatePrivateNavigationQueries
      ).toHaveBeenCalledOnce()
    );
    expect(testState.invalidatePrivateNavigationQueries).toHaveBeenCalledWith(
      expect.any(QueryClient)
    );
  });

  it('refreshes the registered platform page after a successful update', async () => {
    // Given
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const { user } = testRender(<PlatformUpdateSheet {...defaultProps} />, {
      queryClient,
    });

    // When
    await user.click(screen.getByRole('button', { name: 'Utils.Update' }));

    // Then
    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: registrationKeys.allByServiceInstance(),
      })
    );
  });

  it('notifies the caller after a successful update', async () => {
    // Given
    const onUpdated = vi.fn();
    const { user } = testRender(
      <PlatformUpdateSheet
        {...defaultProps}
        onUpdated={onUpdated}
      />
    );

    // When
    await user.click(screen.getByRole('button', { name: 'Utils.Update' }));

    // Then
    await waitFor(() => expect(onUpdated).toHaveBeenCalledOnce());
  });

  it('refreshes the caches even when the sheet unmounts before the update settles', async () => {
    // Given
    const request = Promise.withResolvers<unknown>();
    testState.updatePlatformMetadata.mockReturnValue(request.promise);
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const setOpen = vi.fn();
    const onUpdated = vi.fn();
    const { user, unmount } = testRender(
      <PlatformUpdateSheet
        {...defaultProps}
        setOpen={setOpen}
        onUpdated={onUpdated}
      />,
      { queryClient }
    );
    await user.click(screen.getByRole('button', { name: 'Utils.Update' }));
    expect(onUpdated).not.toHaveBeenCalled();

    // When
    unmount();
    request.resolve({});

    // Then
    await waitFor(() => expect(onUpdated).toHaveBeenCalledOnce());
    expect(testState.invalidatePrivateNavigationQueries).toHaveBeenCalledOnce();
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: registrationKeys.allByServiceInstance(),
    });
    expect(setOpen).not.toHaveBeenCalled();
    expect(testState.showSnackbar).not.toHaveBeenCalled();
  });

  it('keeps the sheet open and shows the server error when the update fails', async () => {
    // Given
    const setOpen = vi.fn();
    testState.updatePlatformMetadata.mockRejectedValue(
      new Error('SERVICE_INSTANCE_NOT_FOUND')
    );
    const { user } = testRender(
      <PlatformUpdateSheet
        {...defaultProps}
        setOpen={setOpen}
      />
    );

    // When
    await user.click(screen.getByRole('button', { name: 'Utils.Update' }));

    // Then
    await waitFor(() =>
      expect(testState.showSnackbar).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          description: 'Error.Server.SERVICE_INSTANCE_NOT_FOUND',
        })
      )
    );
    expect(setOpen).not.toHaveBeenCalled();
    expect(testState.invalidatePrivateNavigationQueries).not.toHaveBeenCalled();
  });
});
