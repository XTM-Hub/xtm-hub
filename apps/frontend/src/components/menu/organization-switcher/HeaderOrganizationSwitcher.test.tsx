import HeaderOrganizationSwitcher from '@/components/menu/organization-switcher/HeaderOrganizationSwitcher';
import { invalidateOrganizationQueries } from '@/components/organization/organization-query-invalidation';
import testRender from '@/utils/test/test-render';
import type { meContext_fragment$data } from '@generated/meContext_fragment.graphql';
import type { MeOrganizationsQuery } from '@graphql/generated';
import {
  focusManager,
  useIsFetching,
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
const ME_ORGANIZATIONS: MeOrganizationsQuery = {
  me: {
    id: 'user-1',
    selected_organization_id: SELECTED_ORGANIZATION_ID,
    organizations: ORGANIZATIONS,
  },
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

// The switcher looks the same while the organizations load, this tells when
// they are done.
const OrganizationsLoading = () => {
  const fetchingCount = useIsFetching({ queryKey: ['MeOrganizations'] });
  return (
    <output aria-label="Organizations loading">
      {fetchingCount > 0 ? 'loading' : 'done'}
    </output>
  );
};

const renderSwitcher = () =>
  testRender(
    <>
      <HeaderOrganizationSwitcher />
      <ReloadOrganizations />
      <OrganizationsLoading />
    </>,
    { me: PORTAL_ME }
  );

const getTrigger = () =>
  screen.getByRole('combobox', {
    name: 'OrganizationSwitcher.SelectOrganization',
  });

const waitForOrganizationsLoaded = () =>
  waitFor(() =>
    expect(screen.getByLabelText('Organizations loading')).toHaveTextContent(
      'done'
    )
  );

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
    mocks.fetchMeOrganizations.mockResolvedValue(ME_ORGANIZATIONS);
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

  it('should show the organization selected in the portal context before the organizations are loaded', () => {
    // Given
    mocks.fetchMeOrganizations.mockReturnValue(new Promise(() => {}));

    // When
    renderSwitcher();

    // Then
    expect(getTrigger()).toHaveTextContent('Filigran Team');
  });

  it('should query the organizations once when it mounts and not when the window regains focus', async () => {
    // Given
    renderSwitcher();
    await waitForOrganizationsLoaded();

    // When
    act(() => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });

    // Then
    expect(getTrigger()).toHaveTextContent('Filigran Team');
    expect(mocks.fetchMeOrganizations).toHaveBeenCalledOnce();
  });

  it('should keep showing the organizations of the portal context when loading them fails', async () => {
    // Given
    mocks.fetchMeOrganizations.mockRejectedValue(new Error('Network error'));

    // When
    renderSwitcher();
    await waitForOrganizationsLoaded();

    // Then
    expect(mocks.fetchMeOrganizations).toHaveBeenCalledOnce();
    expect(getTrigger()).toHaveTextContent('Filigran Team');
  });

  it('should show the organizations loaded again after an organization changes', async () => {
    // Given
    const { user } = renderSwitcher();
    await waitForOrganizationsLoaded();
    mocks.fetchMeOrganizations.mockResolvedValue(RENAMED_ME_ORGANIZATIONS);

    // When
    await user.click(screen.getByRole('button', { name: 'Reload' }));

    // Then
    await waitFor(() =>
      expect(getTrigger()).toHaveTextContent(RENAMED_ORGANIZATION_NAME)
    );
  });

  it('should keep showing the organizations when loading them again fails', async () => {
    // Given
    const { user } = renderSwitcher();
    await waitForOrganizationsLoaded();
    mocks.fetchMeOrganizations.mockRejectedValue(new Error('Network error'));

    // When
    await user.click(screen.getByRole('button', { name: 'Reload' }));

    // Then
    await waitFor(() =>
      expect(mocks.fetchMeOrganizations).toHaveBeenCalledTimes(2)
    );
    await waitForOrganizationsLoaded();
    expect(getTrigger()).toHaveTextContent('Filigran Team');
  });

  it('should render nothing when the user is no longer returned', async () => {
    // Given
    const { user } = renderSwitcher();
    await waitForOrganizationsLoaded();
    mocks.fetchMeOrganizations.mockResolvedValue({ me: null });

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
