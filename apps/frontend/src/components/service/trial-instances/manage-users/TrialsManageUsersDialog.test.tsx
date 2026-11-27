import testRender from '@/utils/test/test-render';
import { act, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TrialsManageUsersDialog } from './TrialsManageUsersDialog';

const SERVICE_INSTANCE_ID = 'service-123';

const mocks = vi.hoisted(() => ({
  useServiceGroupsQuery: vi.fn(() => ({ data: undefined })),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useUsersQuery: () => ({ data: { users: { edges: [] } } }),
    useServiceGroupsQuery: mocks.useServiceGroupsQuery,
  });
});

describe('TrialsManageUsersDialog', () => {
  it('should render the trigger button and not load the service groups on mount', () => {
    testRender(
      <TrialsManageUsersDialog
        serviceInstanceId={SERVICE_INSTANCE_ID}
        organizationId="org-456"
      />
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(mocks.useServiceGroupsQuery).not.toHaveBeenCalled();
  });

  it('should load the service groups of the service instance when the dialog is opened', async () => {
    testRender(
      <TrialsManageUsersDialog
        serviceInstanceId={SERVICE_INSTANCE_ID}
        organizationId="org-456"
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    expect(mocks.useServiceGroupsQuery).toHaveBeenCalledWith(
      expect.anything(),
      { serviceInstanceId: SERVICE_INSTANCE_ID },
      expect.anything()
    );
  });
});
