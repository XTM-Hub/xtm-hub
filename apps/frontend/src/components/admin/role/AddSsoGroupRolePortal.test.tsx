import AddSsoGroupRolePortal from '@/components/admin/role/AddSsoGroupRolePortal';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import {
  AddSsoGroupRolePortalMutation,
  AddSsoGroupRolePortalMutationVariables,
  PortalCapability,
} from '@graphql/generated';
import { mockRolePortal, mockSsoGroupRolePortal } from '@graphql/mocks';
import { screen, waitFor } from '@testing-library/react';
import { graphql, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

const GQL_OPERATION_ADD_SSO_GROUP_ROLE_PORTAL = 'AddSSOGroupRolePortal';

describe('AddSsoGroupRolePortal', () => {
  it('should open the sheet with the mapping form', async () => {
    const { user } = testRender(<AddSsoGroupRolePortal />);

    await user.click(
      screen.getByRole('button', { name: 'RoleListPage.AddMapping' })
    );

    expect(
      screen.getByRole('heading', { name: 'RoleListPage.AddMapping' })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/RoleListPage.SsoGroup/)).toBeInTheDocument();
    expect(screen.getByLabelText(/RoleListPage.Role/)).toBeInTheDocument();
  });

  it('should submit trimmed values with the selected capabilities and close the sheet', async () => {
    let capturedVariables: AddSsoGroupRolePortalMutationVariables | undefined;
    const response: AddSsoGroupRolePortalMutation = {
      addSSOGroupRolePortal: mockSsoGroupRolePortal({
        ssoGroup: 'xtmhub-admins',
        rolePortal: mockRolePortal({ id: 'role-admin', name: 'Admin' }),
      }),
    };
    mswServer.use(
      graphql.mutation(
        GQL_OPERATION_ADD_SSO_GROUP_ROLE_PORTAL,
        ({ variables }) => {
          capturedVariables =
            variables as AddSsoGroupRolePortalMutationVariables;
          return HttpResponse.json({ data: response });
        }
      )
    );

    const { user } = testRender(<AddSsoGroupRolePortal />);

    await user.click(
      screen.getByRole('button', { name: 'RoleListPage.AddMapping' })
    );
    await user.type(
      screen.getByLabelText(/RoleListPage.SsoGroup/),
      '  xtmhub-admins '
    );
    await user.type(screen.getByLabelText(/RoleListPage.Role/), 'Admin');
    await user.click(screen.getByLabelText(/RoleListPage.Capabilities/));
    await user.click(await screen.findByText(PortalCapability.Bypass));
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Utils.Validate' }));

    await waitFor(() => {
      expect(capturedVariables).toEqual({
        input: {
          ssoGroup: 'xtmhub-admins',
          rolePortal: 'Admin',
          capabilities: [PortalCapability.Bypass],
        },
      });
    });
    await waitFor(() => {
      expect(
        screen.queryByLabelText(/RoleListPage.SsoGroup/)
      ).not.toBeInTheDocument();
    });
  });

  it('should not submit when the SSO group and the role only contain spaces', async () => {
    let mutationCalled = false;
    mswServer.use(
      graphql.mutation(GQL_OPERATION_ADD_SSO_GROUP_ROLE_PORTAL, () => {
        mutationCalled = true;
        return HttpResponse.json({ errors: [{ message: 'UNKNOWN_ERROR' }] });
      })
    );

    const { user } = testRender(<AddSsoGroupRolePortal />);

    await user.click(
      screen.getByRole('button', { name: 'RoleListPage.AddMapping' })
    );
    await user.type(screen.getByLabelText(/RoleListPage.SsoGroup/), '   ');
    await user.type(screen.getByLabelText(/RoleListPage.Role/), '   ');
    await user.click(screen.getByRole('button', { name: 'Utils.Validate' }));

    expect(
      await screen.findByText('RoleListPage.Error.SsoGroup')
    ).toBeInTheDocument();
    expect(screen.getByText('RoleListPage.Error.Role')).toBeInTheDocument();
    expect(mutationCalled).toBe(false);
  });

  it('should keep the sheet open when the mutation fails', async () => {
    let mutationCalled = false;
    mswServer.use(
      graphql.mutation(GQL_OPERATION_ADD_SSO_GROUP_ROLE_PORTAL, () => {
        mutationCalled = true;
        return HttpResponse.json({
          errors: [{ message: 'CAPABILITY_PORTAL_NOT_FOUND' }],
        });
      })
    );

    const { user } = testRender(<AddSsoGroupRolePortal />);

    await user.click(
      screen.getByRole('button', { name: 'RoleListPage.AddMapping' })
    );
    await user.type(
      screen.getByLabelText(/RoleListPage.SsoGroup/),
      'xtmhub-admins'
    );
    await user.type(screen.getByLabelText(/RoleListPage.Role/), 'Admin');
    await user.click(screen.getByRole('button', { name: 'Utils.Validate' }));

    await waitFor(() => expect(mutationCalled).toBe(true));
    expect(screen.getByLabelText(/RoleListPage.SsoGroup/)).toBeInTheDocument();
  });
});
