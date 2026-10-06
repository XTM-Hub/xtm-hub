import EditSsoGroupRolePortal from '@/components/admin/role/EditSsoGroupRolePortal';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import {
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
  it('should submit the trimmed new values for the current mapping and close the sheet', async () => {
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
      />
    );

    const ssoGroupInput = screen.getByLabelText(/RoleListPage.SsoGroup/);
    await user.clear(ssoGroupInput);
    await user.type(ssoGroupInput, ' xtmhub-users ');
    const rolePortalInput = screen.getByLabelText(/RoleListPage.Role/);
    await user.clear(rolePortalInput);
    await user.type(rolePortalInput, 'User');
    await user.click(screen.getByRole('button', { name: 'Utils.Validate' }));

    await waitFor(() => {
      expect(capturedVariables).toEqual({
        ssoGroup: SSO_GROUP,
        rolePortal: ROLE_PORTAL,
        input: {
          ssoGroup: 'xtmhub-users',
          rolePortal: 'User',
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

  it('should close the sheet on cancel when nothing was edited', async () => {
    const onOpenChange = vi.fn();

    const { user } = testRender(
      <EditSsoGroupRolePortal
        open
        onOpenChange={onOpenChange}
        ssoGroup={SSO_GROUP}
        rolePortal={ROLE_PORTAL}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Utils.Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(
      screen.queryByText('DialogActions.PreventSheetTitle')
    ).not.toBeInTheDocument();
  });

  it('should ask for confirmation on cancel when the mapping was edited', async () => {
    const onOpenChange = vi.fn();

    const { user } = testRender(
      <EditSsoGroupRolePortal
        open
        onOpenChange={onOpenChange}
        ssoGroup={SSO_GROUP}
        rolePortal={ROLE_PORTAL}
      />
    );

    await user.type(screen.getByLabelText(/RoleListPage.SsoGroup/), 's');
    await user.click(screen.getByRole('button', { name: 'Utils.Cancel' }));

    expect(
      await screen.findByText('DialogActions.PreventSheetTitle')
    ).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
