import { Administratorslist } from '@/components/registration/registerFromHub/Administratorslist';
import testRender from '@/utils/test/test-render';
import { UsersWithCapabilitiesInOrganizationQuery } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('Administratorslist', () => {
  it('renders administrators label and all administrator emails', () => {
    const admins: UsersWithCapabilitiesInOrganizationQuery = {
      usersWithCapabilitiesInOrganization: [
        {
          id: 'admin-1',
          email: 'admin1@example.com',
          first_name: 'Admin',
          last_name: 'One',
        },
        {
          id: 'admin-2',
          email: 'admin2@example.com',
          first_name: 'Admin',
          last_name: 'Two',
        },
      ],
    };

    testRender(<Administratorslist admins={admins} />);

    expect(
      screen.getByText(/Register\.ConnectFromHub\.Administrators/)
    ).toBeInTheDocument();
    expect(screen.getByText('admin1@example.com')).toBeInTheDocument();
    expect(screen.getByText('admin2@example.com')).toBeInTheDocument();
  });

  it('renders only administrators label when there are no administrators', () => {
    const admins: UsersWithCapabilitiesInOrganizationQuery = {
      usersWithCapabilitiesInOrganization: [],
    };

    testRender(<Administratorslist admins={admins} />);

    expect(
      screen.getByText(/Register\.ConnectFromHub\.Administrators/)
    ).toBeInTheDocument();
    expect(screen.queryByText('@example.com')).not.toBeInTheDocument();
  });

  it('renders nothing when admins is not provided', () => {
    const { container } = testRender(<Administratorslist />);

    expect(container).toBeEmptyDOMElement();
  });
});
