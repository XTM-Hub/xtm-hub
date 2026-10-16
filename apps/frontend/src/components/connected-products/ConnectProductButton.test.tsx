import { ConnectProductButton } from '@/components/connected-products/ConnectProductButton';
import { mockGraphqlQuery } from '@/utils/test/msw/graphql-api';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import { OrganizationCapability } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

const CONNECT_PRODUCT_BUTTON = 'Header.ConnectedProducts.ConnectProduct';
const CONNECT_DIALOG_TITLE = 'Register.ConnectFromHub.ConnectProduct';
const PERMISSION_DIALOG_TITLE = 'Register.ConnectFromHub.PermissionRequired';

describe('ConnectProductButton', () => {
  beforeEach(() => {
    mswServer.use(
      mockGraphqlQuery({
        queryName: 'UsersWithCapabilitiesInOrganization',
        data: { usersWithCapabilitiesInOrganization: [] },
      })
    );
  });

  it('should not show the connection dialog before the button is clicked', () => {
    // Given / When
    testRender(<ConnectProductButton />);

    // Then
    expect(
      screen.getByRole('button', { name: CONNECT_PRODUCT_BUTTON })
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should let a user allowed to manage platforms start connecting a product when clicking the button', async () => {
    // Given
    const { user } = testRender(<ConnectProductButton />, {
      me: {
        selected_org_capabilities: [
          OrganizationCapability.ManagePlatformRegistration,
        ],
      },
    });

    // When
    await user.click(
      screen.getByRole('button', { name: CONNECT_PRODUCT_BUTTON })
    );

    // Then
    expect(
      await screen.findByRole('dialog', { name: CONNECT_DIALOG_TITLE })
    ).toBeInTheDocument();
  });

  it('should tell a user without permission to contact an administrator when clicking the button', async () => {
    // Given
    const { user } = testRender(<ConnectProductButton />, {
      me: { selected_org_capabilities: [] },
    });

    // When
    await user.click(
      screen.getByRole('button', { name: CONNECT_PRODUCT_BUTTON })
    );

    // Then
    expect(
      await screen.findByRole('dialog', { name: PERMISSION_DIALOG_TITLE })
    ).toBeInTheDocument();
  });
});
