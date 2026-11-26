import AddRolePortal from '@/components/admin/role/AddRolePortal';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import {
  AddRolePortalMutation,
  AddRolePortalMutationVariables,
  PortalCapability,
} from '@graphql/generated';
import { mockCapability, mockRolePortal } from '@graphql/mocks';
import { screen, waitFor } from '@testing-library/react';
import { graphql, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

const GQL_OPERATION_ADD_ROLE_PORTAL = 'AddRolePortal';

describe('AddRolePortal', () => {
  it('should submit the trimmed name with the selected capabilities and close the sheet', async () => {
    let capturedVariables: AddRolePortalMutationVariables | undefined;
    const response: AddRolePortalMutation = {
      addRolePortal: mockRolePortal({
        id: 'role-auditor',
        name: 'Auditor',
        capabilities: [mockCapability({ name: PortalCapability.Bypass })],
      }),
    };
    mswServer.use(
      graphql.mutation(GQL_OPERATION_ADD_ROLE_PORTAL, ({ variables }) => {
        capturedVariables = variables as AddRolePortalMutationVariables;
        return HttpResponse.json({ data: response });
      })
    );

    const { user } = testRender(<AddRolePortal />);

    await user.click(
      screen.getByRole('button', { name: 'RoleListPage.AddRole' })
    );
    await user.type(screen.getByLabelText(/RoleListPage.Role/), '  Auditor ');
    await user.click(screen.getByLabelText(/RoleListPage.Capabilities/));
    await user.click(await screen.findByText(PortalCapability.Bypass));
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Utils.Validate' }));

    await waitFor(() => {
      expect(capturedVariables).toEqual({
        input: { name: 'Auditor', capabilities: [PortalCapability.Bypass] },
      });
    });
    await waitFor(() => {
      expect(
        screen.queryByLabelText(/RoleListPage.Role/)
      ).not.toBeInTheDocument();
    });
  });

  it('should not submit when the name only contains spaces', async () => {
    let mutationCalled = false;
    mswServer.use(
      graphql.mutation(GQL_OPERATION_ADD_ROLE_PORTAL, () => {
        mutationCalled = true;
        return HttpResponse.json({ errors: [{ message: 'UNKNOWN_ERROR' }] });
      })
    );

    const { user } = testRender(<AddRolePortal />);

    await user.click(
      screen.getByRole('button', { name: 'RoleListPage.AddRole' })
    );
    await user.type(screen.getByLabelText(/RoleListPage.Role/), '   ');
    await user.click(screen.getByRole('button', { name: 'Utils.Validate' }));

    expect(
      await screen.findByText('RoleListPage.Error.Role')
    ).toBeInTheDocument();
    expect(mutationCalled).toBe(false);
  });

  it('should keep the sheet open when the mutation fails', async () => {
    let mutationCalled = false;
    mswServer.use(
      graphql.mutation(GQL_OPERATION_ADD_ROLE_PORTAL, () => {
        mutationCalled = true;
        return HttpResponse.json({
          errors: [{ message: 'ROLE_PORTAL_ALREADY_EXISTS' }],
        });
      })
    );

    const { user } = testRender(<AddRolePortal />);

    await user.click(
      screen.getByRole('button', { name: 'RoleListPage.AddRole' })
    );
    await user.type(screen.getByLabelText(/RoleListPage.Role/), 'USER');
    await user.click(screen.getByRole('button', { name: 'Utils.Validate' }));

    await waitFor(() => expect(mutationCalled).toBe(true));
    expect(screen.getByLabelText(/RoleListPage.Role/)).toBeInTheDocument();
  });
});
