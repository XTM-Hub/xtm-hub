import testRender from '@/utils/test/test-render';
import { act, fireEvent, screen } from '@testing-library/react';
import { createMockEnvironment } from 'relay-test-utils';
import { describe, expect, it, vi } from 'vitest';
import { TrialsManageUsersDialog } from './TrialsManageUsersDialog';

// The users of the form come from react-query, outside the Relay environment.
vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useUsersQuery: () => ({ data: { users: { edges: [] } } }),
  });
});

describe('TrialsManageUsersDialog', () => {
  it('should render the trigger button and not trigger any GraphQL query on mount', () => {
    const environment = createMockEnvironment();
    testRender(
      <TrialsManageUsersDialog
        serviceInstanceId="service-123"
        organizationId="org-456"
      />,
      { relayConfig: environment }
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(environment.mock.getAllOperations()).toHaveLength(0);
  });

  it('should trigger serviceGroupsByServiceInstanceIdQuery when dialog is opened', async () => {
    const environment = createMockEnvironment();
    testRender(
      <TrialsManageUsersDialog
        serviceInstanceId="service-123"
        organizationId="org-456"
      />,
      { relayConfig: environment }
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    // The service groups query is the only Relay operation of the form: it is
    // read while still pending, as nothing resolves it.
    const operations = environment.mock.getAllOperations();
    const serviceGroupsOperation = operations.find(
      (op) =>
        op.request.node.params.name === 'serviceGroupsByServiceInstanceIdQuery'
    );
    expect(serviceGroupsOperation).toBeDefined();
  });
});
