import { ServiceSlugOrgaForm } from '@/components/service/[slug]/ServiceSlugOrgaForm';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import * as SnackbarStore from '@/components/ui/snackbar/snackbar-store';
import { mockMutationHook } from '@/utils/test/mock-mutation-hook';
import {
  mockTranslations,
  translateWithValues,
} from '@/utils/test/mock-translations';
import testRender from '@/utils/test/test-render';
import { serviceInstanceForSubscriptions_fragment$data } from '@generated/serviceInstanceForSubscriptions_fragment.graphql';
import {
  OrganizationItemFragment,
  SubscriptionItemFragment,
} from '@graphql/generated';
import { organizationSubscribedServicesKeys } from '@graphql/organization-subscribed-services/organization-subscribed-services.keys';
import { subscriptionKeys } from '@graphql/subscription/subscription.keys';
import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

const ORGANIZATION_LABEL = 'OrganizationInServiceAction.Organization';
const VALIDATE_LABEL = 'Utils.Validate';
const LOAD_ERROR = 'OrganizationActions.LoadOrganizationsError';
const SUBSCRIBED_ORGANIZATION_ID = 'org-subscribed';
const ACME_ORGANIZATION: OrganizationItemFragment = {
  id: 'org-acme',
  name: 'Acme Corporation',
  personal_space: false,
  domains: [],
};
const SUBSCRIBED_ORGANIZATION: OrganizationItemFragment = {
  id: SUBSCRIBED_ORGANIZATION_ID,
  name: 'Already Subscribed',
  personal_space: false,
  domains: [],
};

const SERVICE_INSTANCE: serviceInstanceForSubscriptions_fragment$data = {
  ' $fragmentType': 'serviceInstanceForSubscriptions_fragment',
  __id: 'service-instance-connection',
  id: 'service-instance-id',
  name: 'OpenCTI Library',
  description: null,
  tags: null,
  service_definition: { service_capability: [] },
};

const SUBSCRIPTION: SubscriptionItemFragment = {
  id: 'subscription-id',
  organization: SUBSCRIBED_ORGANIZATION,
  service_instance: { id: SERVICE_INSTANCE.id, name: SERVICE_INSTANCE.name },
  start_date: null,
  end_date: null,
  subscription_capability: [],
};

const mocks = vi.hoisted(() => ({
  useOrganizationsListQuery: vi.fn(),
  useCreateSubscriptionsMutation: vi.fn(),
  useUpdateSubscriptionMutation: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return {
    ...(await mockGeneratedQueryHooks(importOriginal, {
      useOrganizationsListQuery: mocks.useOrganizationsListQuery,
    })),
    useCreateSubscriptionsMutation: mocks.useCreateSubscriptionsMutation,
    useUpdateSubscriptionMutation: mocks.useUpdateSubscriptionMutation,
  };
});

const mockOrganizationsQuery = (
  result: Partial<{
    organizations: OrganizationItemFragment[];
    isLoading: boolean;
    isError: boolean;
  }>
) => {
  const organizations = result.organizations ?? [];
  mocks.useOrganizationsListQuery.mockReturnValue({
    data: result.isError
      ? undefined
      : {
          organizations: {
            totalCount: organizations.length,
            edges: organizations.map((node) => ({ node })),
          },
        },
    isLoading: result.isLoading ?? false,
    isError: result.isError ?? false,
    isPlaceholderData: false,
  });
};

const renderForm = (subscriptionToEdit?: SubscriptionItemFragment) => {
  const queryClient = new QueryClient();
  const invalidateQueries = vi
    .spyOn(queryClient, 'invalidateQueries')
    .mockResolvedValue();
  const setOpen = vi.fn();
  const buildForm = () => (
    <SheetWithPreventingDialog
      open
      setOpen={setOpen}
      title="Add organization">
      <ServiceSlugOrgaForm
        serviceInstance={SERVICE_INSTANCE}
        subscriptions={[SUBSCRIPTION]}
        subscriptionToEdit={subscriptionToEdit}
      />
    </SheetWithPreventingDialog>
  );
  const rendered = testRender(buildForm(), { queryClient });

  return {
    ...rendered,
    invalidateQueries,
    setOpen,
    rerenderForm: () => rendered.rerender(buildForm()),
  };
};

const getOrganizationCombobox = () =>
  screen.getByRole('combobox', { name: ORGANIZATION_LABEL });

const validate = (user: ReturnType<typeof renderForm>['user']) =>
  user.click(screen.getByRole('button', { name: VALIDATE_LABEL }));

const subscribeAcme = async (user: ReturnType<typeof renderForm>['user']) => {
  await user.click(getOrganizationCombobox());
  await user.click(
    await screen.findByRole('option', { name: ACME_ORGANIZATION.name })
  );
  await validate(user);
};

const shouldHandleSubmissionOutcomes = ({
  hook,
  perform,
  subscriptionToEdit,
}: {
  hook: Mock;
  perform: (user: ReturnType<typeof renderForm>['user']) => Promise<void>;
  subscriptionToEdit?: SubscriptionItemFragment;
}) => {
  it.each`
    key                                         | description
    ${subscriptionKeys.all()}                   | ${'the subscriptions of the service'}
    ${subscriptionKeys.allById()}               | ${'the subscription detail'}
    ${organizationSubscribedServicesKeys.all()} | ${'the subscribed services of the organization'}
  `('should invalidate $description when it succeeds', async ({ key }) => {
    // Given
    mockMutationHook(hook, 'success');
    const { user, invalidateQueries } = renderForm(subscriptionToEdit);

    // When
    await perform(user);

    // Then
    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: key })
    );
  });

  it('should confirm with a snackbar and close the sheet when it succeeds', async () => {
    // Given
    mockMutationHook(hook, 'success');
    const { user, setOpen } = renderForm(subscriptionToEdit);

    // When
    await perform(user);

    // Then
    await waitFor(() => expect(setOpen).toHaveBeenCalledWith(false));
    expect(SnackbarStore.showSnackbar).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'success',
        title: 'Utils.Success',
        description: 'ServiceActions.OrganizationAdded',
      })
    );
  });

  it('should show the server error and invalidate nothing when it fails', async () => {
    // Given
    mockMutationHook(hook, 'error', {
      error: new Error('SUBSCRIPTION_NOT_FOUND'),
    });
    const { user, invalidateQueries } = renderForm(subscriptionToEdit);

    // When
    await perform(user);

    // Then
    await waitFor(() =>
      expect(SnackbarStore.showSnackbar).toHaveBeenCalledWith({
        severity: 'error',
        title: 'Utils.Error',
        description: <>{'Error.Server.SUBSCRIPTION_NOT_FOUND'}</>,
      })
    );
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
};

describe('ServiceSlugOrgaForm', () => {
  beforeEach(() => {
    mockOrganizationsQuery({
      organizations: [ACME_ORGANIZATION, SUBSCRIBED_ORGANIZATION],
    });
    mockMutationHook(mocks.useCreateSubscriptionsMutation, 'success');
    mockMutationHook(mocks.useUpdateSubscriptionMutation, 'success');
    vi.spyOn(SnackbarStore, 'showSnackbar').mockImplementation(() => undefined);
  });

  it('should only propose the organizations not yet subscribed to the service', async () => {
    // Given
    const { user } = renderForm();

    // When
    await user.click(getOrganizationCombobox());

    // Then
    expect(
      (await screen.findAllByRole('option')).map((option) => option.textContent)
    ).toEqual([ACME_ORGANIZATION.name]);
  });

  it('should show the load error when the organizations cannot be loaded', () => {
    // Given
    mockOrganizationsQuery({ isError: true });

    // When
    renderForm();

    // Then
    expect(screen.getByText(LOAD_ERROR)).toBeInTheDocument();
  });

  it('should show the loading message while the organizations load', async () => {
    // Given
    mockOrganizationsQuery({ isLoading: true });
    const { user } = renderForm();

    // When
    await user.click(getOrganizationCombobox());

    // Then
    expect(await screen.findByText('Utils.Loading')).toBeInTheDocument();
  });

  describe('creation of a subscription', () => {
    shouldHandleSubmissionOutcomes({
      hook: mocks.useCreateSubscriptionsMutation,
      perform: subscribeAcme,
    });

    it('should send the chosen organization and the service when a subscription is created', async () => {
      // Given
      const mutate = mockMutationHook(
        mocks.useCreateSubscriptionsMutation,
        'success'
      );
      const { user } = renderForm();

      // When
      await subscribeAcme(user);

      // Then
      expect(mutate).toHaveBeenCalledWith({
        input: expect.objectContaining({
          service_instance_id: SERVICE_INSTANCE.id,
          organization_id: [ACME_ORGANIZATION.id],
        }),
      });
    });

    it('should name the chosen organization and the service in the snackbar when a subscription is created', async () => {
      // Given
      vi.mocked(useTranslations).mockReturnValue(
        mockTranslations({ translate: translateWithValues })
      );
      mockMutationHook(mocks.useCreateSubscriptionsMutation, 'success');
      const { user } = renderForm();

      // When
      await subscribeAcme(user);

      // Then
      await waitFor(() =>
        expect(SnackbarStore.showSnackbar).toHaveBeenCalledWith(
          expect.objectContaining({
            severity: 'success',
            description: translateWithValues(
              'ServiceActions.OrganizationAdded',
              {
                name: ACME_ORGANIZATION.name,
                serviceName: SERVICE_INSTANCE.name,
              }
            ),
          })
        )
      );
    });

    it('should disable Validate while the subscription is being created', async () => {
      // Given
      mockMutationHook(mocks.useCreateSubscriptionsMutation, 'success', {
        isPending: true,
      });
      const { user } = renderForm();

      // When
      await user.click(getOrganizationCombobox());
      await user.click(
        await screen.findByRole('option', { name: ACME_ORGANIZATION.name })
      );

      // Then
      expect(
        screen.getByRole('button', { name: VALIDATE_LABEL })
      ).toBeDisabled();
    });
  });

  describe('update of a subscription', () => {
    shouldHandleSubmissionOutcomes({
      hook: mocks.useUpdateSubscriptionMutation,
      perform: validate,
      subscriptionToEdit: SUBSCRIPTION,
    });

    it('should send the edited subscription when it is updated', async () => {
      // Given
      const mutate = mockMutationHook(
        mocks.useUpdateSubscriptionMutation,
        'success'
      );
      const { user } = renderForm(SUBSCRIPTION);

      // When
      await validate(user);

      // Then
      expect(mutate).toHaveBeenCalledWith({
        subscription_id: SUBSCRIPTION.id,
        input: expect.objectContaining({ capability_ids: [] }),
      });
    });

    it('should disable Validate while the subscription is being updated', async () => {
      // Given a valid form, so that only the pending update can disable Validate
      let isPending = false;
      mocks.useUpdateSubscriptionMutation.mockImplementation(() => ({
        mutate: vi.fn(),
        isPending,
      }));
      const { rerenderForm } = renderForm(SUBSCRIPTION);
      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: VALIDATE_LABEL })
        ).toBeEnabled()
      );

      // When the update is in progress
      isPending = true;
      rerenderForm();

      // Then
      expect(
        screen.getByRole('button', { name: VALIDATE_LABEL })
      ).toBeDisabled();
    });
  });
});
