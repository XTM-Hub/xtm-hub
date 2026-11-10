import { ServiceSlugDeleteSubscription } from '@/components/service/[slug]/ServiceSlugDeleteSubscription';
import * as SnackbarStore from '@/components/ui/snackbar/snackbar-store';
import { mockMutationHook } from '@/utils/test/mock-mutation-hook';
import {
  mockTranslations,
  translateWithValues,
} from '@/utils/test/mock-translations';
import testRender from '@/utils/test/test-render';
import { organizationSubscribedServicesKeys } from '@graphql/organization-subscribed-services/organization-subscribed-services.keys';
import { serviceUserCapabilitiesKeys } from '@graphql/service-instances/service-instances.keys';
import { subscriptionKeys } from '@graphql/subscription/subscription.keys';
import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useDeleteSubscriptionsMutation: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useDeleteSubscriptionsMutation: mocks.useDeleteSubscriptionsMutation,
}));

const CONFIRM_LABEL = 'Service.Management.RemoveAccess';
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

const renderDialog = (subscriptions = [SUBSCRIPTION]) => {
  const queryClient = new QueryClient();
  const invalidateQueries = vi
    .spyOn(queryClient, 'invalidateQueries')
    .mockResolvedValue();
  const setOpen = vi.fn();
  const onDeleted = vi.fn();
  const rendered = testRender(
    <ServiceSlugDeleteSubscription
      subscriptions={subscriptions}
      open
      setOpen={setOpen}
      onDeleted={onDeleted}
    />,
    { queryClient }
  );

  return { ...rendered, queryClient, invalidateQueries, setOpen, onDeleted };
};

const confirm = (user: ReturnType<typeof renderDialog>['user']) =>
  user.click(screen.getByRole('button', { name: CONFIRM_LABEL }));

describe('ServiceSlugDeleteSubscription', () => {
  beforeEach(() => {
    vi.spyOn(SnackbarStore, 'showSnackbar').mockImplementation(() => undefined);
  });

  it('should send the ids of the subscriptions when the user confirms', async () => {
    // Given
    const mutate = mockMutationHook(
      mocks.useDeleteSubscriptionsMutation,
      'success'
    );
    const { user } = renderDialog();

    // When
    await confirm(user);

    // Then
    expect(mutate).toHaveBeenCalledWith({
      subscription_ids: [SUBSCRIPTION.id],
    });
  });

  it.each`
    key                                         | description
    ${subscriptionKeys.all()}                   | ${'the subscriptions of the service'}
    ${subscriptionKeys.allById()}               | ${'the subscription detail'}
    ${organizationSubscribedServicesKeys.all()} | ${'the subscribed services of the organization'}
    ${serviceUserCapabilitiesKeys.all()}        | ${'the capabilities of the user on a service'}
  `(
    'should invalidate $description when the deletion succeeds',
    async ({ key }) => {
      // Given
      mockMutationHook(mocks.useDeleteSubscriptionsMutation, 'success');
      const { user, invalidateQueries } = renderDialog();

      // When
      await confirm(user);

      // Then
      await waitFor(() =>
        expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: key })
      );
    }
  );

  it('should close the dialog, clear the selection and confirm with a snackbar when the deletion succeeds', async () => {
    // Given
    mockMutationHook(mocks.useDeleteSubscriptionsMutation, 'success');
    const { user, setOpen, onDeleted } = renderDialog();

    // When
    await confirm(user);

    // Then
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(setOpen).toHaveBeenCalledWith(false);
    expect(SnackbarStore.showSnackbar).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'success',
        title: 'Utils.Success',
        description: 'ServiceActions.OrganizationDeleted',
      })
    );
  });

  it('should show the server error and invalidate nothing when the deletion fails', async () => {
    // Given
    mockMutationHook(mocks.useDeleteSubscriptionsMutation, 'error', {
      error: new Error('SUBSCRIPTION_NOT_FOUND'),
    });
    const { user, invalidateQueries, onDeleted } = renderDialog();

    // When
    await confirm(user);

    // Then
    await waitFor(() =>
      expect(SnackbarStore.showSnackbar).toHaveBeenCalledWith({
        severity: 'error',
        title: 'Utils.Error',
        description: <>{'Error.Server.SUBSCRIPTION_NOT_FOUND'}</>,
      })
    );
    expect(invalidateQueries).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('should remove the detail of the deleted subscription from the cache and keep the others when the deletion succeeds', async () => {
    // Given
    mockMutationHook(mocks.useDeleteSubscriptionsMutation, 'success');
    const { user, queryClient } = renderDialog();
    const deletedKey = subscriptionKeys.byId({
      subscriptionId: SUBSCRIPTION.id,
    });
    const otherKey = subscriptionKeys.byId({
      subscriptionId: 'subscription-2',
    });
    queryClient.setQueryData(deletedKey, { subscriptionById: SUBSCRIPTION });
    queryClient.setQueryData(otherKey, { subscriptionById: null });

    // When
    await confirm(user);

    // Then
    await waitFor(() =>
      expect(queryClient.getQueryData(deletedKey)).toBeUndefined()
    );
    expect(queryClient.getQueryData(otherKey)).toBeDefined();
  });

  it('should keep the detail of the subscription in the cache when the deletion fails', async () => {
    // Given
    mockMutationHook(mocks.useDeleteSubscriptionsMutation, 'error');
    const { user, queryClient } = renderDialog();
    const key = subscriptionKeys.byId({ subscriptionId: SUBSCRIPTION.id });
    queryClient.setQueryData(key, { subscriptionById: SUBSCRIPTION });

    // When
    await confirm(user);

    // Then
    await waitFor(() => expect(SnackbarStore.showSnackbar).toHaveBeenCalled());
    expect(queryClient.getQueryData(key)).toBeDefined();
  });

  it('should disable the confirm button while the deletion is in progress', () => {
    // Given
    mockMutationHook(mocks.useDeleteSubscriptionsMutation, 'success', {
      isPending: true,
    });

    // When
    renderDialog();

    // Then
    expect(screen.getByRole('button', { name: CONFIRM_LABEL })).toBeDisabled();
  });

  it('should remove every deleted detail from the cache and name every organization in the snackbar when several subscriptions are deleted', async () => {
    // Given
    vi.mocked(useTranslations).mockReturnValue(
      mockTranslations({ translate: translateWithValues })
    );
    mockMutationHook(mocks.useDeleteSubscriptionsMutation, 'success');
    const otherSubscription = {
      ...SUBSCRIPTION,
      id: 'subscription-2',
      organization: {
        ...SUBSCRIPTION.organization,
        id: 'organization-2',
        name: 'Globex',
      },
    };
    const { user, queryClient } = renderDialog([
      SUBSCRIPTION,
      otherSubscription,
    ]);
    const keys = [SUBSCRIPTION, otherSubscription].map(({ id }) =>
      subscriptionKeys.byId({ subscriptionId: id })
    );
    keys.forEach((key) => queryClient.setQueryData(key, {}));

    // When
    await confirm(user);

    // Then
    await waitFor(() =>
      expect(SnackbarStore.showSnackbar).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'success',
          description: translateWithValues(
            'ServiceActions.OrganizationDeleted',
            {
              name: `${SUBSCRIPTION.organization.name}, ${otherSubscription.organization.name}`,
            }
          ),
        })
      )
    );
    keys.forEach((key) =>
      expect(queryClient.getQueryData(key)).toBeUndefined()
    );
  });
});
