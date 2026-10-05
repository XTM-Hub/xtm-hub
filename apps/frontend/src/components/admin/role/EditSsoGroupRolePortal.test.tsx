import EditSsoGroupRolePortal from '@/components/admin/role/EditSsoGroupRolePortal';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import {
  PortalCapability,
  UpdateSsoGroupRolePortalMutation,
  UpdateSsoGroupRolePortalMutationVariables,
} from '@graphql/generated';
import { mockRolePortal, mockSsoGroupRolePortal } from '@graphql/mocks';
import { screen, waitFor } from '@testing-library/react';
import { graphql, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

const GQL_OPERATION_UPDATE_SSO_GROUP_ROLE_PORTAL = 'UpdateSSOGroupRolePortal';
const SSO_GROUP = 'xtmhub-admins';
const ROLE_PORTAL = 'Admin';

describe('EditSsoGroupRolePortal', () => {
  it('should submit the trimmed new values and capabilities for the current mapping and close the sheet', async () => {
    let capturedVariables:
      UpdateSsoGroupRolePortalMutationVariables | undefined;
    const response: UpdateSsoGroupRolePortalMutation = {
      updateSSOGroupRolePortal: mockSsoGroupRolePortal({
        ssoGroup: 'xtmhub-users',
        rolePortal: mockRolePortal({ id: 'role-user', name: 'User' }),
      }),
    };
    mswServer.use(
      graphql.mutation(
        GQL_OPERATION_UPDATE_SSO_GROUP_ROLE_PORTAL,
        ({ variables }) => {
          capturedVariables =
            variables as UpdateSsoGroupRolePortalMutationVariables;
          return HttpResponse.json({ data: response });
        }
      )
    );
    const onOpenChange = vi.fn();

    const { user } = testRender(
      <EditSsoGroupRolePortal
        open
        onOpenChange={onOpenChange}
        ssoGroup={SSO_GROUP}
        rolePortal={ROLE_PORTAL}
        capabilities={[PortalCapability.Bypass]}
      />
    );

    const ssoGroupInput = screen.getByLabelText(/RoleListPage.SsoGroup/);
    await user.clear(ssoGroupInput);
    await user.type(ssoGroupInput, ' xtmhub-users ');
    const rolePortalInput = screen.getByLabelText(/RoleListPage.Role/);
    await user.clear(rolePortalInput);
    await user.type(rolePortalInput, 'User');
    await user.click(screen.getByLabelText(/RoleListPage.Capabilities/));
    await user.click(await screen.findByText(PortalCapability.ReadTrials));
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Utils.Validate' }));

    await waitFor(() => {
      expect(capturedVariables).toEqual({
        ssoGroup: SSO_GROUP,
        rolePortal: ROLE_PORTAL,
        input: {
          ssoGroup: 'xtmhub-users',
          rolePortal: 'User',
          capabilities: [PortalCapability.Bypass, PortalCapability.ReadTrials],
        },
      });
    });
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('should keep the sheet open when the mutation fails', async () => {
    let mutationCalled = false;
    mswServer.use(
      graphql.mutation(GQL_OPERATION_UPDATE_SSO_GROUP_ROLE_PORTAL, () => {
        mutationCalled = true;
        return HttpResponse.json({
          errors: [{ message: 'SSO_GROUP_ROLE_PORTAL_ALREADY_EXISTS' }],
        });
      })
    );
    const onOpenChange = vi.fn();

    const { user } = testRender(
      <EditSsoGroupRolePortal
        open
        onOpenChange={onOpenChange}
        ssoGroup={SSO_GROUP}
        rolePortal={ROLE_PORTAL}
        capabilities={[PortalCapability.Bypass]}
      />
    );

    const rolePortalInput = screen.getByLabelText(/RoleListPage.Role/);
    await user.clear(rolePortalInput);
    await user.type(rolePortalInput, 'User');
    await user.click(screen.getByRole('button', { name: 'Utils.Validate' }));

    await waitFor(() => expect(mutationCalled).toBe(true));
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('should not submit when the SSO group only contains spaces', async () => {
    let mutationCalled = false;
    mswServer.use(
      graphql.mutation(GQL_OPERATION_UPDATE_SSO_GROUP_ROLE_PORTAL, () => {
        mutationCalled = true;
        return HttpResponse.json({ errors: [{ message: 'UNKNOWN_ERROR' }] });
      })
    );

    const { user } = testRender(
      <EditSsoGroupRolePortal
        open
        onOpenChange={vi.fn()}
        ssoGroup={SSO_GROUP}
        rolePortal={ROLE_PORTAL}
        capabilities={[PortalCapability.Bypass]}
      />
    );

    const ssoGroupInput = screen.getByLabelText(/RoleListPage.SsoGroup/);
    await user.clear(ssoGroupInput);
    await user.type(ssoGroupInput, '   ');
    await user.click(screen.getByRole('button', { name: 'Utils.Validate' }));

    expect(
      await screen.findByText('RoleListPage.Error.SsoGroup')
    ).toBeInTheDocument();
    expect(mutationCalled).toBe(false);
  });
});
