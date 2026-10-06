import EditRolePortal from '@/components/admin/role/EditRolePortal';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import {
  PortalCapability,
  UpdateRolePortalMutation,
  UpdateRolePortalMutationVariables,
} from '@graphql/generated';
import { mockRolePortal } from '@graphql/mocks';
import { screen, waitFor } from '@testing-library/react';
import { graphql, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

const GQL_OPERATION_UPDATE_ROLE_PORTAL = 'UpdateRolePortal';
const ROLE_PORTAL = 'Auditor';

describe('EditRolePortal', () => {
  it('should submit the trimmed new name and capabilities for the current role and close the sheet', async () => {
    let capturedVariables: UpdateRolePortalMutationVariables | undefined;
    const response: UpdateRolePortalMutation = {
      updateRolePortal: mockRolePortal({
        id: 'role-auditor',
        name: 'Reviewer',
      }),
    };
    mswServer.use(
      graphql.mutation(GQL_OPERATION_UPDATE_ROLE_PORTAL, ({ variables }) => {
        capturedVariables = variables as UpdateRolePortalMutationVariables;
        return HttpResponse.json({ data: response });
      })
    );
    const onOpenChange = vi.fn();

    const { user } = testRender(
      <EditRolePortal
        open
        onOpenChange={onOpenChange}
        rolePortal={ROLE_PORTAL}
        capabilities={[PortalCapability.Bypass]}
      />
    );

    const nameInput = screen.getByLabelText(/RoleListPage.Role/);
    expect(nameInput).toHaveValue(ROLE_PORTAL);
    await user.clear(nameInput);
    await user.type(nameInput, ' Reviewer ');
    await user.click(screen.getByLabelText(/RoleListPage.Capabilities/));
    await user.click(await screen.findByText(PortalCapability.ReadTrials));
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Utils.Validate' }));

    await waitFor(() => {
      expect(capturedVariables).toEqual({
        name: ROLE_PORTAL,
        input: {
          name: 'Reviewer',
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
      graphql.mutation(GQL_OPERATION_UPDATE_ROLE_PORTAL, () => {
        mutationCalled = true;
        return HttpResponse.json({
          errors: [{ message: 'ROLE_PORTAL_PROTECTED' }],
        });
      })
    );
    const onOpenChange = vi.fn();

    const { user } = testRender(
      <EditRolePortal
        open
        onOpenChange={onOpenChange}
        rolePortal={ROLE_PORTAL}
        capabilities={[PortalCapability.Bypass]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Utils.Validate' }));

    await waitFor(() => expect(mutationCalled).toBe(true));
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('should close the sheet on cancel when nothing was edited', async () => {
    const onOpenChange = vi.fn();

    const { user } = testRender(
      <EditRolePortal
        open
        onOpenChange={onOpenChange}
        rolePortal={ROLE_PORTAL}
        capabilities={[PortalCapability.Bypass]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Utils.Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(
      screen.queryByText('DialogActions.PreventSheetTitle')
    ).not.toBeInTheDocument();
  });

  it('should ask for confirmation on cancel when the role was edited', async () => {
    const onOpenChange = vi.fn();

    const { user } = testRender(
      <EditRolePortal
        open
        onOpenChange={onOpenChange}
        rolePortal={ROLE_PORTAL}
        capabilities={[PortalCapability.Bypass]}
      />
    );

    await user.type(screen.getByLabelText(/RoleListPage.Role/), 's');
    await user.click(screen.getByRole('button', { name: 'Utils.Cancel' }));

    expect(
      await screen.findByText('DialogActions.PreventSheetTitle')
    ).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
