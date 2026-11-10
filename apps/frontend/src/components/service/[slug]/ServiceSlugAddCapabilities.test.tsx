import { ServiceSlugAddCapabilities } from '@/components/service/[slug]/ServiceSlugAddCapabilities';
import * as SnackbarStore from '@/components/ui/snackbar/snackbar-store';
import { mockMutationHook } from '@/utils/test/mock-mutation-hook';
import testRender from '@/utils/test/test-render';
import { organizationSubscribedServicesKeys } from '@graphql/organization-subscribed-services/organization-subscribed-services.keys';
import { subscriptionKeys } from '@graphql/subscription/subscription.keys';
import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useAddSubscriptionCapabilityMutation: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useAddSubscriptionCapabilityMutation:
    mocks.useAddSubscriptionCapabilityMutation,
}));

const VALIDATE_LABEL = 'Utils.Validate';
const CAPABILITY = { id: 'capability-1', name: 'Upload' };
const SUBSCRIPTION = {
  id: 'subscription-1',
  organization: {
    id: 'organization-1',
    name: 'Acme Corporation',
    personal_space: false,
  },
  subscription_capability: [],
  service_instance: { id: 'service-instance-1', name: 'OpenCTI Library' },
  start_date: null,
  end_date: null,
};

const renderDialog = () => {
  const queryClient = new QueryClient();
  const invalidateQueries = vi
    .spyOn(queryClient, 'invalidateQueries')
    .mockResolvedValue();
  const setOpen = vi.fn();
  const onCompleted = vi.fn();
  const rendered = testRender(
    <ServiceSlugAddCapabilities
      selectedSubscriptions={[SUBSCRIPTION]}
      availableCapabilities={[CAPABILITY]}
      open
      setOpen={setOpen}
      onCompleted={onCompleted}
    />,
    { queryClient }
  );

  return { ...rendered, invalidateQueries, setOpen, onCompleted };
};

const validateWithCapability = async (
  user: ReturnType<typeof renderDialog>['user']
) => {
  await user.click(screen.getByRole('checkbox', { name: CAPABILITY.name }));
  await user.click(screen.getByRole('button', { name: VALIDATE_LABEL }));
};

describe('ServiceSlugAddCapabilities', () => {
  beforeEach(() => {
    vi.spyOn(SnackbarStore, 'showSnackbar').mockImplementation(() => undefined);
  });

  it('should send the selected subscriptions and capabilities when the user validates', async () => {
    // Given
    const mutate = mockMutationHook(
      mocks.useAddSubscriptionCapabilityMutation,
      'success'
    );
    const { user } = renderDialog();

    // When
    await validateWithCapability(user);

    // Then
    expect(mutate).toHaveBeenCalledWith({
      input: {
        subscriptionsId: [SUBSCRIPTION.id],
        capabilitiesId: [CAPABILITY.id],
      },
    });
  });

  it.each`
    key                                         | description
    ${subscriptionKeys.all()}                   | ${'the subscriptions of the service'}
    ${subscriptionKeys.allById()}               | ${'the subscription detail'}
    ${organizationSubscribedServicesKeys.all()} | ${'the subscribed services of the organization'}
  `(
    'should invalidate $description when the capabilities are added',
    async ({ key }) => {
      // Given
      mockMutationHook(mocks.useAddSubscriptionCapabilityMutation, 'success');
      const { user, invalidateQueries } = renderDialog();

      // When
      await validateWithCapability(user);

      // Then
      await waitFor(() =>
        expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: key })
      );
    }
  );

  it('should close the dialog and clear the selection when the capabilities are added', async () => {
    // Given
    mockMutationHook(mocks.useAddSubscriptionCapabilityMutation, 'success');
    const { user, setOpen, onCompleted } = renderDialog();

    // When
    await validateWithCapability(user);

    // Then
    await waitFor(() => expect(onCompleted).toHaveBeenCalled());
    expect(setOpen).toHaveBeenCalledWith(false);
  });

  it('should show the server error and invalidate nothing when adding the capabilities fails', async () => {
    // Given
    mockMutationHook(mocks.useAddSubscriptionCapabilityMutation, 'error', {
      error: new Error('SUBSCRIPTION_NOT_FOUND'),
    });
    const { user, invalidateQueries, onCompleted } = renderDialog();

    // When
    await validateWithCapability(user);

    // Then
    await waitFor(() =>
      expect(SnackbarStore.showSnackbar).toHaveBeenCalledWith({
        severity: 'error',
        title: 'Utils.Error',
        description: <>{'Error.Server.SUBSCRIPTION_NOT_FOUND'}</>,
      })
    );
    expect(invalidateQueries).not.toHaveBeenCalled();
    expect(onCompleted).not.toHaveBeenCalled();
  });

  it('should disable Validate while the capabilities are being added', async () => {
    // Given
    mockMutationHook(mocks.useAddSubscriptionCapabilityMutation, 'success', {
      isPending: true,
    });
    const { user } = renderDialog();

    // When
    await user.click(screen.getByRole('checkbox', { name: CAPABILITY.name }));

    // Then
    expect(screen.getByRole('button', { name: VALIDATE_LABEL })).toBeDisabled();
  });
});
