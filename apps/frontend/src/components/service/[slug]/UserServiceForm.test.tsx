import { UserServiceForm } from '@/components/service/[slug]/UserServiceForm';
import testRender from '@/utils/test/test-render';
import { subscriptionByIdQuery$data } from '@generated/subscriptionByIdQuery.graphql';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const VALIDATE_LABEL = 'Utils.Validate';

const SUBSCRIPTION = {
  subscriptionById: {
    id: 'subscription-1',
    organization: { id: 'organization-1' },
    service_instance: {
      id: 'service-instance-1',
      name: 'Service',
      service_definition: { service_capability: [] },
    },
    subscription_capability: [],
  },
} as unknown as subscriptionByIdQuery$data;

vi.mock('react-relay', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-relay')>()),
  readInlineData: (_fragment: unknown, node: unknown) => node,
  useMutation: () => [vi.fn(), true],
}));

vi.mock('@/hooks/use-users-list', () => ({
  useUsersList: () => ({
    data: { users: { edges: [] } },
    refetch: vi.fn(),
  }),
}));

vi.mock('@/components/ui/SheetWithPreventingDialog', () => ({
  useDialogContext: () => ({
    handleCloseSheet: vi.fn(),
    setIsDirty: vi.fn(),
    setOpenSheet: vi.fn(),
  }),
}));

describe('UserServiceForm', () => {
  it('should disable the validate button while the user service mutation is in flight', () => {
    // Given a user service mutation in flight
    // When the form renders
    testRender(
      <UserServiceForm
        connectionId="connection-1"
        subscription={SUBSCRIPTION}
      />
    );

    // Then the form cannot be submitted again
    expect(
      screen.getByRole('button', { name: new RegExp(`^${VALIDATE_LABEL}`) })
    ).toBeDisabled();
  });
});
