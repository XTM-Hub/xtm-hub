import { PlatformUpdateSheet } from '@/components/service/components/PlatformUpdateSheet';
import testRender from '@/utils/test/test-render';
import { ServiceDefinitionIdentifier } from '@graphql/generated';
import { QueryClient } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import React from 'react';
import { createMockEnvironment } from 'relay-test-utils';
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

vi.mock('react-relay', async (importOriginal) => ({
  ...(await importOriginal()),
  useMutation: () => [testState.commitMutation, false],
}));

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
      (opts: {
        variables: Record<string, unknown>;
        onCompleted?: () => void;
      }) => {
        testState.lastVariables = opts.variables;
        opts.onCompleted?.();
      }
    );
  });

  it('displays URL input with the provided URL', () => {
    testRender(<PlatformUpdateSheet {...defaultProps} />, {
      relayConfig: createMockEnvironment(),
    });

    expect(
      screen.getByDisplayValue('https://platform.example.com')
    ).toBeInTheDocument();
  });

  it('renders URL input as non-editable', () => {
    testRender(<PlatformUpdateSheet {...defaultProps} />, {
      relayConfig: createMockEnvironment(),
    });

    expect(screen.getByDisplayValue(defaultProps.platformUrl)).toBeDisabled();
  });

  it('submits only serviceInstanceId and name in mutation input', async () => {
    const setOpen = vi.fn();
    const { user } = testRender(
      <PlatformUpdateSheet
        {...defaultProps}
        setOpen={setOpen}
      />,
      {
        relayConfig: createMockEnvironment(),
      }
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
    const { user } = testRender(<PlatformUpdateSheet {...defaultProps} />, {
      relayConfig: createMockEnvironment(),
    });

    expect(testState.invalidatePrivateNavigationQueries).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Utils.Update' }));

    expect(testState.invalidatePrivateNavigationQueries).toHaveBeenCalledOnce();
    expect(testState.invalidatePrivateNavigationQueries).toHaveBeenCalledWith(
      expect.any(QueryClient)
    );
  });
});
