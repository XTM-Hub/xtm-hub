import { ConnectedProductsDropdown } from '@/components/connected-products/ConnectedProductsDropdown';
import { mockGraphqlQuery } from '@/utils/test/msw/graphql-api';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import {
  OrganizationCapability,
  RegisteredPlatformsListQuery,
  ServiceDefinitionIdentifier,
} from '@graphql/generated';
import { mockRegisteredPlatform } from '@graphql/mocks';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

const COUNT_BUTTON = 'Header.ConnectedProducts.Count';
const CONNECT_PRODUCT_ITEM = 'Header.ConnectedProducts.ConnectProduct';
const CONNECT_DIALOG_TITLE = 'Register.ConnectFromHub.ConnectProduct';
const OPENCTI_TITLE = 'Production OpenCTI';
const OPENAEV_TITLE = 'Staging OpenAEV';

const PLATFORMS: RegisteredPlatformsListQuery['registeredPlatforms'] = [
  mockRegisteredPlatform({
    id: 'platform-opencti',
    title: OPENCTI_TITLE,
    identifier: ServiceDefinitionIdentifier.OpenctiRegistration,
    subscription: null,
    deployment_request: null,
  }),
  mockRegisteredPlatform({
    id: 'platform-openaev',
    title: OPENAEV_TITLE,
    identifier: ServiceDefinitionIdentifier.OpenaevRegistration,
    subscription: null,
    deployment_request: null,
  }),
];

const givenConnectedPlatforms = (
  registeredPlatforms: RegisteredPlatformsListQuery['registeredPlatforms']
) => {
  mswServer.use(
    mockGraphqlQuery({
      queryName: 'RegisteredPlatformsList',
      data: { registeredPlatforms },
    })
  );
};

describe('ConnectedProductsDropdown', () => {
  beforeEach(() => {
    mswServer.use(
      mockGraphqlQuery({
        queryName: 'UsersWithCapabilitiesInOrganization',
        data: { usersWithCapabilitiesInOrganization: [] },
      })
    );
  });

  it('should list every connected product when the user opens the dropdown', async () => {
    // Given
    givenConnectedPlatforms(PLATFORMS);
    const { user } = testRender(<ConnectedProductsDropdown />);

    // When
    await user.click(screen.getByRole('button', { name: COUNT_BUTTON }));

    // Then
    expect(await screen.findByText(OPENCTI_TITLE)).toBeInTheDocument();
    expect(screen.getByText(OPENAEV_TITLE)).toBeInTheDocument();
  });

  it('should only offer to connect a product when none is connected yet', async () => {
    // Given
    givenConnectedPlatforms([]);
    const { user } = testRender(<ConnectedProductsDropdown />);

    // When
    await user.click(screen.getByRole('button', { name: COUNT_BUTTON }));

    // Then
    expect(
      await screen.findByRole('menuitem', { name: CONNECT_PRODUCT_ITEM })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('menuitem')).toHaveLength(1);
  });

  it('should keep offering to connect another product after the connected ones', async () => {
    // Given
    givenConnectedPlatforms(PLATFORMS);
    const { user } = testRender(<ConnectedProductsDropdown />);

    // When
    await user.click(screen.getByRole('button', { name: COUNT_BUTTON }));

    // Then
    await screen.findByText(OPENCTI_TITLE);
    expect(
      screen.getByRole('menuitem', { name: CONNECT_PRODUCT_ITEM })
    ).toBeInTheDocument();
  });

  it('should open the connection dialog when the user chooses to connect a product', async () => {
    // Given
    givenConnectedPlatforms(PLATFORMS);
    const { user } = testRender(<ConnectedProductsDropdown />, {
      me: {
        selected_org_capabilities: [
          OrganizationCapability.ManagePlatformRegistration,
        ],
      },
    });
    await user.click(screen.getByRole('button', { name: COUNT_BUTTON }));

    // When
    await user.click(
      await screen.findByRole('menuitem', { name: CONNECT_PRODUCT_ITEM })
    );

    // Then
    expect(
      await screen.findByRole('dialog', { name: CONNECT_DIALOG_TITLE })
    ).toBeInTheDocument();
  });
});
