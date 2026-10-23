import HeaderOrganizationSwitcher from '@/components/menu/organization-switcher/HeaderOrganizationSwitcher';
import { invalidateOrganizationQueries } from '@/components/organization/organization-query-invalidation';
import testRender from '@/utils/test/test-render';
import type { meContext_fragment$data } from '@generated/meContext_fragment.graphql';
import type { MeOrganizationsQuery } from '@graphql/generated';
import {
  focusManager,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { act, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  changeSelectedOrganization: vi.fn(),
  fetchMeOrganizations: vi.fn(),
  useMeOrganizationsQuery: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return {
    ...(await mockGeneratedQueryHooks(importOriginal, {
      useMeOrganizationsQuery: mocks.useMeOrganizationsQuery,
    })),
    // Settles like react-query: the success callback runs once the switch resolves.
    useChangeSelectedOrganizationMutation: () => ({
      mutate: (variables: unknown, callbacks?: { onSuccess?: () => void }) => {
        mocks.changeSelectedOrganization(variables);
        void Promise.resolve().then(() => callbacks?.onSuccess?.());
      },
      isPending: false,
    }),
  };
});

// Keeps the options the switcher passes, only the request is mocked.
const useMeOrganizationsQueryWithMockedFetch = (
  _client: unknown,
  _variables: unknown,
  options?: Omit<UseQueryOptions<MeOrganizationsQuery>, 'queryKey'>
) =>
  useQuery({
    ...options,
    queryKey: ['MeOrganizations'],
    queryFn: mocks.fetchMeOrganizations,
  });

const PERSONAL_ORGANIZATION_ID = 'organization-1';
const SELECTED_ORGANIZATION_ID = 'organization-2';
const RENAMED_ORGANIZATION_NAME = 'Filigran Corporation';
const ORGANIZATIONS = [
  {
    id: PERSONAL_ORGANIZATION_ID,
    name: 'john.doe@filigran.io',
    personal_space: true,
  },
  {
    id: SELECTED_ORGANIZATION_ID,
    name: 'Filigran Team',
    personal_space: false,
  },
];
// The user the server loaded into the portal context.
const PORTAL_ME: Partial<meContext_fragment$data> = {
  id: 'user-1',
  selected_organization_id: SELECTED_ORGANIZATION_ID,
  organizations: ORGANIZATIONS,
};
const RENAMED_ME_ORGANIZATIONS: MeOrganizationsQuery = {
  me: {
    id: 'user-1',
    selected_organization_id: SELECTED_ORGANIZATION_ID,
    organizations: [
      ORGANIZATIONS[0],
      { ...ORGANIZATIONS[1], name: RENAMED_ORGANIZATION_NAME },
    ],
  },
};

// Stands for an organization edit or deletion, which reloads the organizations.
const ReloadOrganizations = () => {
  const queryClient = useQueryClient();
  return (
    <button onClick={() => void invalidateOrganizationQueries(queryClient)}>
      Reload
    </button>
  );
};

const renderSwitcher = () =>
  testRender(
    <>
      <HeaderOrganizationSwitcher />
      <ReloadOrganizations />
    </>,
    { me: PORTAL_ME }
  );

const getTrigger = () =>
  screen.getByRole('combobox', {
    name: 'OrganizationSwitcher.SelectOrganization',
  });

describe('HeaderOrganizationSwitcher', () => {
  // A successful switch reloads the page, which jsdom cannot navigate to.
  let location = { href: '' };

  beforeEach(() => {
    vi.clearAllMocks();
    location = { href: '' };
    vi.stubGlobal('location', location);
    mocks.useMeOrganizationsQuery.mockImplementation(
      useMeOrganizationsQueryWithMockedFetch
    );
    mocks.fetchMeOrganizations.mockResolvedValue(RENAMED_ME_ORGANIZATIONS);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    focusManager.setFocused(undefined);
  });

  it('renders workspace label and selected organization on combobox trigger', () => {
    renderSwitcher();

    expect(
      screen.getByText('OrganizationSwitcher.Workspace')
    ).toBeInTheDocument();
    expect(getTrigger()).toHaveTextContent('Filigran Team');
  });

  it('lists the organizations in their original order', async () => {
    const { user } = renderSwitcher();

    await user.click(getTrigger());

    expect(
      screen.getAllByRole('option').map((option) => option.textContent)
    ).toEqual(['OrganizationSwitcher.PersonalSpace', 'Filigran Team']);
  });

  it('switches organization and closes options after selecting another organization', async () => {
    const { user } = renderSwitcher();

    await user.click(getTrigger());
    await user.click(
      screen.getByRole('option', { name: 'OrganizationSwitcher.PersonalSpace' })
    );

    expect(
      screen.queryByRole('option', {
        name: 'OrganizationSwitcher.PersonalSpace',
      })
    ).not.toBeInTheDocument();
    expect(mocks.changeSelectedOrganization).toHaveBeenCalledOnce();
    expect(mocks.changeSelectedOrganization).toHaveBeenCalledWith({
      organization_id: PERSONAL_ORGANIZATION_ID,
    });
  });

  it('keeps the organization and closes options when selecting current organization', async () => {
    const { user } = renderSwitcher();

    await user.click(getTrigger());
    await user.click(screen.getByRole('option', { name: 'Filigran Team' }));

    expect(
      screen.queryByRole('option', {
        name: 'OrganizationSwitcher.PersonalSpace',
      })
    ).not.toBeInTheDocument();
    expect(mocks.changeSelectedOrganization).not.toHaveBeenCalled();
  });

  it('should reload the application home when the organization switch succeeds', async () => {
    // Given
    const { user } = renderSwitcher();
    await user.click(getTrigger());

    // When
    await user.click(
      screen.getByRole('option', { name: 'OrganizationSwitcher.PersonalSpace' })
    );

    // Then
    await waitFor(() => expect(location.href).toBe('/app'));
  });

  it('should not query the organizations when it mounts or the window regains focus', () => {
    // Given
    renderSwitcher();

    // When
    act(() => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });

    // Then
    expect(getTrigger()).toHaveTextContent('Filigran Team');
    expect(mocks.fetchMeOrganizations).not.toHaveBeenCalled();
  });

  it('should show the organizations loaded again after an organization changes', async () => {
    // Given
    const { user } = renderSwitcher();

    // When
    await user.click(screen.getByRole('button', { name: 'Reload' }));

    // Then
    await waitFor(() =>
      expect(getTrigger()).toHaveTextContent(RENAMED_ORGANIZATION_NAME)
    );
  });

  it('should keep showing the organizations when loading them again fails', async () => {
    // Given
    mocks.fetchMeOrganizations.mockRejectedValue(new Error('Network error'));
    const { user } = renderSwitcher();

    // When
    await user.click(screen.getByRole('button', { name: 'Reload' }));

    // Then
    await waitFor(() =>
      expect(mocks.fetchMeOrganizations).toHaveBeenCalledOnce()
    );
    expect(getTrigger()).toHaveTextContent('Filigran Team');
  });

  it('should render nothing when the user is no longer returned', async () => {
    // Given
    mocks.fetchMeOrganizations.mockResolvedValue({ me: null });
    const { user } = renderSwitcher();

    // When
    await user.click(screen.getByRole('button', { name: 'Reload' }));

    // Then
    await waitFor(() =>
      expect(
        screen.queryByText('OrganizationSwitcher.Workspace')
      ).not.toBeInTheDocument()
    );
  });
});
