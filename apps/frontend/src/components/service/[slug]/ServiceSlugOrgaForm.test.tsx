import { ServiceSlugOrgaForm } from '@/components/service/[slug]/ServiceSlugOrgaForm';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import testRender from '@/utils/test/test-render';
import { serviceInstanceForSubscriptions_fragment$data } from '@generated/serviceInstanceForSubscriptions_fragment.graphql';
import { subscription_fragment$data } from '@generated/subscription_fragment.graphql';
import { OrganizationItemFragment } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ORGANIZATION_LABEL = 'OrganizationInServiceAction.Organization';
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

const SUBSCRIPTION: subscription_fragment$data = {
  ' $fragmentType': 'subscription_fragment',
  id: 'subscription-id',
  organization: SUBSCRIBED_ORGANIZATION,
  service_instance: { id: SERVICE_INSTANCE.id, name: SERVICE_INSTANCE.name },
  start_date: null,
  end_date: null,
  subscription_capability: [],
};

const mocks = vi.hoisted(() => ({
  useOrganizationsListQuery: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useOrganizationsListQuery: mocks.useOrganizationsListQuery,
  });
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

const renderForm = () =>
  testRender(
    <SheetWithPreventingDialog
      open
      setOpen={vi.fn()}
      title="Add organization">
      <ServiceSlugOrgaForm
        serviceInstance={SERVICE_INSTANCE}
        subscriptions={[SUBSCRIPTION]}
        subscriptionConnectionId="subscription-connection"
      />
    </SheetWithPreventingDialog>
  );

const getOrganizationCombobox = () =>
  screen.getByRole('combobox', { name: ORGANIZATION_LABEL });

describe('ServiceSlugOrgaForm', () => {
  beforeEach(() => {
    mockOrganizationsQuery({
      organizations: [ACME_ORGANIZATION, SUBSCRIBED_ORGANIZATION],
    });
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
});
