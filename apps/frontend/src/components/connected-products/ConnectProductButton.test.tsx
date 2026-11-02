import { ConnectProductButton } from '@/components/connected-products/ConnectProductButton';
import { mockGraphqlQuery } from '@/utils/test/msw/graphql-api';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import { OrganizationCapability } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

const CONNECT_PRODUCT_BUTTON = 'Header.ConnectedProducts.ConnectProduct';
const CONNECT_DIALOG_TITLE = 'Register.ConnectFromHub.ConnectProduct';
const ALLOWED_CAPABILITIES = [
  OrganizationCapability.ManagePlatformRegistration,
];

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

  it('should open the connection dialog when clicking the button', async () => {
    // Given
    const { user } = testRender(<ConnectProductButton />, {
      me: { selected_org_capabilities: ALLOWED_CAPABILITIES },
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

  it('should not mention a connected product in the dialog opened from the button', async () => {
    // Given
    const { user } = testRender(<ConnectProductButton />, {
      me: { selected_org_capabilities: ALLOWED_CAPABILITIES },
    });

    // When
    await user.click(
      screen.getByRole('button', { name: CONNECT_PRODUCT_BUTTON })
    );

    // Then
    const dialog = await screen.findByRole('dialog', {
      name: CONNECT_DIALOG_TITLE,
    });
    expect(dialog).not.toHaveTextContent(
      'Register.ConnectFromHub.ConnectedProductSentence'
    );
    expect(dialog).toHaveTextContent(
      'Register.ConnectFromHub.RedirectionMessage'
    );
  });
});
