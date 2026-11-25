import { AdminRegisteredPlatforms } from '@/components/admin/registered-platform/AdminRegisteredPlatforms';
import testRender from '@/utils/test/test-render';
import {
  type AdminRegisteredPlatformRowFragment,
  type AdminRegisteredPlatformsQueryVariables,
  CommercialModel,
  PlatformConfigurationStatus,
  PlatformContract,
  PlatformIdentifier,
  RegisteredPlatformCredentialKind,
} from '@graphql/generated';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const SERVICE_INSTANCE_ID = 'service-instance-id';
const PLATFORM_ID = 'platform-id';
const TENANT_ID = 'tenant-id';
const TENANT_NAME = 'Main tenant';
const TITLE = 'Production OpenCTI';
const URL = 'https://opencti.filigran.io';
const VERSION = '6.8.1';
const ORGANIZATION_ID = 'organization-id';
const ORGANIZATION_NAME = 'Filigran';
const REGISTERER_EMAIL = 'ada@filigran.io';
const UNKNOWN_CREDENTIAL_KIND = 'key';
const SEARCH_TERM = 'filigran';

const mocks = vi.hoisted(() => ({
  useAdminRegisteredPlatformsQuery: vi.fn(),
  useAdminUnregisterPlatformMutation: vi.fn(),
  useOrganizationsListQuery: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return {
    ...(await mockGeneratedQueryHooks(importOriginal, {
      useAdminRegisteredPlatformsQuery: mocks.useAdminRegisteredPlatformsQuery,
      useOrganizationsListQuery: mocks.useOrganizationsListQuery,
    })),
    useAdminUnregisterPlatformMutation:
      mocks.useAdminUnregisterPlatformMutation,
  };
});

const buildPlatform = (
  overrides: Partial<AdminRegisteredPlatformRowFragment> = {}
): AdminRegisteredPlatformRowFragment => ({
  service_instance_id: SERVICE_INSTANCE_ID,
  platform_id: PLATFORM_ID,
  title: TITLE,
  url: URL,
  identifier: PlatformIdentifier.Opencti,
  version: VERSION,
  contract: PlatformContract.Ee,
  commercial_model: CommercialModel.Saas,
  tenant_id: TENANT_ID,
  tenant_name: TENANT_NAME,
  status: PlatformConfigurationStatus.Active,
  last_connectivity_check: '2026-11-17T10:00:00.000Z',
  organization: { id: ORGANIZATION_ID, name: ORGANIZATION_NAME },
  registerer: {
    id: 'user-id',
    email: REGISTERER_EMAIL,
    first_name: 'Ada',
    last_name: 'Lovelace',
  },
  credential: { kind: RegisteredPlatformCredentialKind.Token, has_token: true },
  is_trial: false,
  ...overrides,
});

const mockPlatforms = (platforms: AdminRegisteredPlatformRowFragment[]) =>
  mocks.useAdminRegisteredPlatformsQuery.mockReturnValue({
    data: {
      adminRegisteredPlatforms: {
        totalCount: platforms.length,
        edges: platforms.map((node) => ({ node })),
      },
    },
    isLoading: false,
  });

const lastQueryVariables = () =>
  mocks.useAdminRegisteredPlatformsQuery.mock
    .lastCall?.[1] as AdminRegisteredPlatformsQueryVariables;

const getPlatformRow = () =>
  screen.getByRole('row', { name: new RegExp(TITLE) });

const pickOption = async (
  user: ReturnType<typeof testRender>['user'],
  filterLabel: string,
  optionLabel: string
) => {
  await user.click(screen.getByRole('combobox', { name: filterLabel }));
  await user.click(screen.getByRole('option', { name: optionLabel }));
};

describe('AdminRegisteredPlatforms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockPlatforms([buildPlatform()]);
    mocks.useAdminUnregisterPlatformMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mocks.useOrganizationsListQuery.mockReturnValue({
      data: {
        organizations: {
          totalCount: 1,
          edges: [
            {
              node: {
                id: ORGANIZATION_ID,
                name: ORGANIZATION_NAME,
                personal_space: false,
                domains: [],
              },
            },
          ],
        },
      },
      isLoading: false,
      isError: false,
    });
  });

  it('should list each platform with its product, organization, tenant, contract, status, registerer and identifiers', () => {
    // Given / When
    testRender(<AdminRegisteredPlatforms />);

    // Then
    const row = within(getPlatformRow());
    [
      TITLE,
      'OpenCTI',
      VERSION,
      ORGANIZATION_NAME,
      TENANT_NAME,
      'Contracts.EE',
      'AdminRegisteredPlatforms.CommercialModel.SAAS',
      'AdminRegisteredPlatforms.Status.active',
      REGISTERER_EMAIL,
      SERVICE_INSTANCE_ID,
      PLATFORM_ID,
      TENANT_ID,
    ].forEach((text) => expect(row.getByText(text)).toBeInTheDocument());
  });

  it('should open the URL of a platform in a new tab, without giving it access to the Hub', () => {
    // Given / When
    testRender(<AdminRegisteredPlatforms />);

    // Then
    const link = within(getPlatformRow()).getByRole('link', { name: URL });
    expect(link).toHaveAttribute('href', URL);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it.each([
    [
      'a token',
      { kind: RegisteredPlatformCredentialKind.Token, has_token: true },
      'AdminRegisteredPlatforms.Credential.Kind.token',
      'AdminRegisteredPlatforms.Credential.TokenStored',
    ],
    [
      'no credential',
      { kind: RegisteredPlatformCredentialKind.None, has_token: false },
      'AdminRegisteredPlatforms.Credential.Kind.none',
      'AdminRegisteredPlatforms.Credential.NoTokenStored',
    ],
    [
      'a credential kind this client does not know yet',
      {
        kind: UNKNOWN_CREDENTIAL_KIND as RegisteredPlatformCredentialKind,
        has_token: false,
      },
      UNKNOWN_CREDENTIAL_KIND,
      'AdminRegisteredPlatforms.Credential.NoTokenStored',
    ],
  ])(
    'should show the credential of a platform with %s',
    (_label, credential, expectedKind, expectedToken) => {
      // Given
      mockPlatforms([buildPlatform({ credential })]);

      // When
      testRender(<AdminRegisteredPlatforms />);

      // Then
      const row = within(getPlatformRow());
      expect(row.getByText(expectedKind)).toBeInTheDocument();
      expect(row.getByText(expectedToken)).toBeInTheDocument();
    }
  );

  it.each([
    [PlatformConfigurationStatus.Active, 1],
    [PlatformConfigurationStatus.Inactive, 0],
  ])(
    'should offer to unregister a platform %s %i time(s)',
    (status, expectedButtons) => {
      // Given
      mockPlatforms([buildPlatform({ status })]);

      // When
      testRender(<AdminRegisteredPlatforms />);

      // Then
      expect(
        within(getPlatformRow()).queryAllByRole('button', {
          name: 'AdminRegisteredPlatforms.Unregister',
        })
      ).toHaveLength(expectedButtons);
    }
  );

  it.each([
    [true, 0],
    [false, 1],
  ])(
    'should offer to unregister an active platform flagged as a trial %s %i time(s)',
    (is_trial, expectedButtons) => {
      // Given an EE contract: the server flag decides, whatever the contract
      mockPlatforms([
        buildPlatform({ contract: PlatformContract.Ee, is_trial }),
      ]);

      // When
      testRender(<AdminRegisteredPlatforms />);

      // Then
      expect(
        within(getPlatformRow()).queryAllByRole('button', {
          name: 'AdminRegisteredPlatforms.Unregister',
        })
      ).toHaveLength(expectedButtons);
    }
  );

  it('should offer to unregister an active platform that belongs to no organization', () => {
    // Given
    mockPlatforms([buildPlatform({ organization: null })]);

    // When
    testRender(<AdminRegisteredPlatforms />);

    // Then
    expect(
      within(getPlatformRow()).getByRole('button', {
        name: 'AdminRegisteredPlatforms.Unregister',
      })
    ).toBeInTheDocument();
  });

  it('should list the platforms from the most recently checked one, without filter, when the admin opens the page', () => {
    // Given / When
    testRender(<AdminRegisteredPlatforms />);

    // Then
    expect(lastQueryVariables()).toMatchObject({
      orderBy: 'last_connectivity_check',
      orderMode: 'desc',
      searchTerm: null,
      filter: null,
    });
  });

  it('should fetch the platforms matching what the admin searches for', async () => {
    // Given
    testRender(<AdminRegisteredPlatforms />);

    // When
    fireEvent.change(screen.getByLabelText('AdminRegisteredPlatforms.Search'), {
      target: { value: `  ${SEARCH_TERM}  ` },
    });

    // Then
    await waitFor(() =>
      expect(lastQueryVariables()).toMatchObject({ searchTerm: SEARCH_TERM })
    );
  });

  it.each([
    [
      'AdminRegisteredPlatforms.Filters.Product',
      'OpenAEV',
      { identifier: PlatformIdentifier.Openaev },
    ],
    [
      'AdminRegisteredPlatforms.Filters.Status',
      'AdminRegisteredPlatforms.Status.inactive',
      { status: PlatformConfigurationStatus.Inactive },
    ],
  ])(
    'should fetch the platforms filtered on the %s the admin picks',
    async (filterLabel, optionLabel, expectedFilter) => {
      // Given
      const { user } = testRender(<AdminRegisteredPlatforms />);

      // When
      await pickOption(user, filterLabel, optionLabel);

      // Then
      expect(lastQueryVariables().filter).toEqual({
        identifier: null,
        status: null,
        organizationId: null,
        ...expectedFilter,
      });
    }
  );

  it('should fetch the platforms of the organization the admin picks', async () => {
    // Given
    const { user } = testRender(<AdminRegisteredPlatforms />);

    // When
    await user.click(
      screen.getByRole('combobox', { name: 'UserActions.Organization' })
    );
    await user.click(screen.getByRole('option', { name: ORGANIZATION_NAME }));

    // Then
    expect(lastQueryVariables().filter).toMatchObject({
      organizationId: ORGANIZATION_ID,
    });
  });

  it('should fetch every platform again when the admin picks all products after a product', async () => {
    // Given
    const { user } = testRender(<AdminRegisteredPlatforms />);
    await pickOption(
      user,
      'AdminRegisteredPlatforms.Filters.Product',
      'OpenAEV'
    );

    // When
    await pickOption(
      user,
      'AdminRegisteredPlatforms.Filters.Product',
      'AdminRegisteredPlatforms.Filters.AllProducts'
    );

    // Then
    expect(lastQueryVariables().filter).toBeNull();
  });
});
