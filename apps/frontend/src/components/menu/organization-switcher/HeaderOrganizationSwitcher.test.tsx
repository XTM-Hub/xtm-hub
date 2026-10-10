import HeaderOrganizationSwitcher from '@/components/menu/organization-switcher/HeaderOrganizationSwitcher';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { createMockEnvironment } from 'relay-test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('HeaderOrganizationSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders workspace label and selected organization on combobox trigger', () => {
    testRender(<HeaderOrganizationSwitcher />, {
      me: {
        email: 'john.doe@filigran.io',
        selected_organization_id: 'organization-2',
        organizations: [
          {
            id: 'organization-1',
            name: 'john.doe@filigran.io',
            personal_space: true,
          },
          {
            id: 'organization-2',
            name: 'Filigran Team',
            personal_space: false,
          },
        ],
      },
    });

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
    const { user } = testRender(<HeaderOrganizationSwitcher />, {
      me: {
        email: 'john.doe@filigran.io',
        selected_organization_id: 'organization-2',
        organizations: [
          {
            id: 'organization-1',
            name: 'john.doe@filigran.io',
            personal_space: true,
          },
          {
            id: 'organization-2',
            name: 'Filigran Team',
            personal_space: false,
          },
        ],
      },
    });

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
    const environment = createMockEnvironment();
    const { user } = testRender(<HeaderOrganizationSwitcher />, {
      relayConfig: environment,
      me: {
        email: 'john.doe@filigran.io',
        selected_organization_id: 'organization-2',
        organizations: [
          {
            id: 'organization-1',
            name: 'john.doe@filigran.io',
            personal_space: true,
          },
          {
            id: 'organization-2',
            name: 'Filigran Team',
            personal_space: false,
          },
        ],
      },
    });

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
    const operation = environment.mock.getMostRecentOperation();
    expect(operation.request.node.operation.name).toBe(
      'OrganizationSwitcherMutation'
    );
    expect(operation.request.variables).toEqual({
      organization_id: 'organization-1',
    });
  });

  it('keeps the organization and closes options when selecting current organization', async () => {
    const environment = createMockEnvironment();
    const { user } = testRender(<HeaderOrganizationSwitcher />, {
      relayConfig: environment,
      me: {
        email: 'john.doe@filigran.io',
        selected_organization_id: 'organization-2',
        organizations: [
          {
            id: 'organization-1',
            name: 'john.doe@filigran.io',
            personal_space: true,
          },
          {
            id: 'organization-2',
            name: 'Filigran Team',
            personal_space: false,
          },
        ],
      },
    });

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
    expect(environment.mock.getAllOperations()).toHaveLength(0);
  });
});
