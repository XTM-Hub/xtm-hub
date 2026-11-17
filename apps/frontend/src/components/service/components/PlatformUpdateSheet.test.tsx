import { PlatformUpdateSheet } from '@/components/service/components/PlatformUpdateSheet';
import testRender from '@/utils/test/test-render';
import { ServiceDefinitionIdentifier } from '@graphql/generated';
import { registrationKeys } from '@graphql/registration/registration.keys';
import { QueryClient } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  commitMutation: vi.fn(),
  lastVariables: null as Record<string, unknown> | null,
  invalidatePrivateNavigationQueries: vi.fn(),
}));

vi.mock(
  '@/components/menu/navigation/private/private-navigation-query-invalidation',
  () => ({
    invalidatePrivateNavigationQueries:
      testState.invalidatePrivateNavigationQueries,
  })
);

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
  return mockGeneratedQueryHooks(importOriginal, {
    useUpdatePlatformServiceMetadataMutation: () => ({
      mutate: testState.commitMutation,
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
    testState.lastVariables = null;
    testState.commitMutation.mockReset();
    testState.invalidatePrivateNavigationQueries.mockReset();
    testState.commitMutation.mockImplementation(
      (
        variables: Record<string, unknown>,
        options?: { onSuccess?: () => void }
      ) => {
        testState.lastVariables = variables;
        options?.onSuccess?.();
      }
    );
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
    const setOpen = vi.fn();
    const { user } = testRender(
      <PlatformUpdateSheet
        {...defaultProps}
        setOpen={setOpen}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Utils.Update' }));

    expect(testState.lastVariables).toEqual({
      input: {
        serviceInstanceId: defaultProps.serviceInstanceId,
        name: defaultProps.serviceInstanceName,
      },
    });
    expect(
      (testState.lastVariables as { input: Record<string, unknown> }).input
    ).not.toHaveProperty('url');
  });

  it('invalidates the private navigation queries after a successful update', async () => {
    const { user } = testRender(<PlatformUpdateSheet {...defaultProps} />);

    expect(testState.invalidatePrivateNavigationQueries).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Utils.Update' }));

    expect(testState.invalidatePrivateNavigationQueries).toHaveBeenCalledOnce();
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
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: registrationKeys.allByServiceInstance(),
    });
  });

  it('keeps the sheet open and shows the server error when the update fails', async () => {
    // Given
    const setOpen = vi.fn();
    testState.commitMutation.mockImplementation(
      (_variables, options: { onError: (error: Error) => void }) =>
        options.onError(new Error('SERVICE_INSTANCE_NOT_FOUND'))
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
    expect(setOpen).not.toHaveBeenCalled();
    expect(testState.invalidatePrivateNavigationQueries).not.toHaveBeenCalled();
  });
});
