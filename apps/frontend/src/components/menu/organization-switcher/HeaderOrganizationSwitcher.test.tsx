import HeaderOrganizationSwitcher from '@/components/menu/organization-switcher/HeaderOrganizationSwitcher';
import testRender from '@/utils/test/test-render';
import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  changeSelectedOrganization: vi.fn(),
}));

// Settles like react-query: the success callback runs once the switch resolves.
vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useChangeSelectedOrganizationMutation: () => ({
    mutate: (variables: unknown, callbacks?: { onSuccess?: () => void }) => {
      mocks.changeSelectedOrganization(variables);
      void Promise.resolve().then(() => callbacks?.onSuccess?.());
    },
    isPending: false,
  }),
}));

const PERSONAL_ORGANIZATION_ID = 'organization-1';
const ME = {
  email: 'john.doe@filigran.io',
  selected_organization_id: 'organization-2',
  organizations: [
    {
      id: PERSONAL_ORGANIZATION_ID,
      name: 'john.doe@filigran.io',
      personal_space: true,
    },
    {
      id: 'organization-2',
      name: 'Filigran Team',
      personal_space: false,
    },
  ],
};

describe('HeaderOrganizationSwitcher', () => {
  // A successful switch reloads the page, which jsdom cannot navigate to.
  let location = { href: '' };

  beforeEach(() => {
    vi.clearAllMocks();
    location = { href: '' };
    vi.stubGlobal('location', location);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders workspace label and selected organization on combobox trigger', () => {
    testRender(<HeaderOrganizationSwitcher />, { me: ME });

    expect(
      screen.getByText('OrganizationSwitcher.Workspace')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', {
        name: 'OrganizationSwitcher.SelectOrganization',
      })
    ).toHaveTextContent('Filigran Team');
  });

  it('lists the organizations in their original order', async () => {
    const { user } = testRender(<HeaderOrganizationSwitcher />, { me: ME });

    await user.click(
      screen.getByRole('combobox', {
        name: 'OrganizationSwitcher.SelectOrganization',
      })
    );

    expect(
      screen.getAllByRole('option').map((option) => option.textContent)
    ).toEqual(['OrganizationSwitcher.PersonalSpace', 'Filigran Team']);
  });

  it('switches organization and closes options after selecting another organization', async () => {
    const { user } = testRender(<HeaderOrganizationSwitcher />, { me: ME });

    await user.click(
      screen.getByRole('combobox', {
        name: 'OrganizationSwitcher.SelectOrganization',
      })
    );
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
    const { user } = testRender(<HeaderOrganizationSwitcher />, { me: ME });

    await user.click(
      screen.getByRole('combobox', {
        name: 'OrganizationSwitcher.SelectOrganization',
      })
    );
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
    const { user } = testRender(<HeaderOrganizationSwitcher />, { me: ME });
    await user.click(
      screen.getByRole('combobox', {
        name: 'OrganizationSwitcher.SelectOrganization',
      })
    );

    // When
    await user.click(
      screen.getByRole('option', { name: 'OrganizationSwitcher.PersonalSpace' })
    );

    // Then
    await waitFor(() => expect(location.href).toBe('/app'));
  });
});
