import {
  RegistrationContext,
  RegistrationState,
} from '@/components/registration/Context';
import { PlatformMetadataMapping } from '@/components/registration/PlatformIdentifierMapping';
import { RegisterStateMissingCapability } from '@/components/registration/register/MissingCapability';
import testRender from '@/utils/test/test-render';
import {
  OrganizationCapability,
  PlatformIdentifier,
  UsersWithCapabilitiesInOrganizationQuery,
} from '@graphql/generated';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useUsersWithCapabilitiesInOrganizationQuery: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useUsersWithCapabilitiesInOrganizationQuery:
      mocks.useUsersWithCapabilitiesInOrganizationQuery,
  });
});

vi.mock('@/components/Loader', () => ({
  default: () => <div data-testid="loader" />,
}));

const ORGANIZATION_ID = 'organization-id';
const LOADER_TEST_ID = 'loader';
const TITLE = 'Register.Error.Capability.Title';
const DESCRIPTION = 'Register.Error.Capability.Description';
const ADMIN_LIST_TITLE = 'Register.Error.Capability.AdminListTitle';
const BACK_LABEL = 'Register.Back';

const ADMINISTRATORS: UsersWithCapabilitiesInOrganizationQuery = {
  usersWithCapabilitiesInOrganization: [
    {
      id: 'user-1',
      first_name: 'Alice',
      last_name: 'Smith',
      email: 'alice@example.com',
    },
    {
      id: 'user-2',
      first_name: 'Bob',
      last_name: 'Jones',
      email: 'bob@example.com',
    },
  ],
};

type QueryOptions = {
  throwOnError: (
    error: Error,
    query: {
      state: { data: UsersWithCapabilitiesInOrganizationQuery | undefined };
    }
  ) => boolean;
};

const lastQueryVariables = () =>
  mocks.useUsersWithCapabilitiesInOrganizationQuery.mock.lastCall?.[1];

const lastQueryOptions = () =>
  mocks.useUsersWithCapabilitiesInOrganizationQuery.mock
    .lastCall?.[2] as QueryOptions;

const REGISTRATION_STATE: RegistrationState = {
  displayedIdentifier: PlatformMetadataMapping[PlatformIdentifier.Opencti].name,
  capability: OrganizationCapability.ManagePlatformRegistration,
};

const renderMissingCapability = ({
  registrationState = REGISTRATION_STATE,
  cancel = vi.fn(),
}: {
  registrationState?: RegistrationState;
  cancel?: () => void;
} = {}) =>
  testRender(
    <RegistrationContext.Provider value={registrationState}>
      <RegisterStateMissingCapability
        organizationId={ORGANIZATION_ID}
        cancel={cancel}
      />
    </RegistrationContext.Provider>
  );

describe('RegisterStateMissingCapability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useUsersWithCapabilitiesInOrganizationQuery.mockReturnValue({
      data: ADMINISTRATORS,
    });
  });

  it.each([
    {
      case: 'the administrators and the users holding the missing capability',
      capability: OrganizationCapability.ManagePlatformRegistration,
      expectedCapabilities: [
        OrganizationCapability.AdministrateOrganization,
        OrganizationCapability.ManagePlatformRegistration,
      ],
    },
    {
      case: 'only the administrators when no capability is missing',
      capability: undefined,
      expectedCapabilities: [OrganizationCapability.AdministrateOrganization],
    },
  ])('should query $case', ({ capability, expectedCapabilities }) => {
    // When
    renderMissingCapability({
      registrationState: { ...REGISTRATION_STATE, capability },
    });

    // Then
    expect(lastQueryVariables()).toEqual({
      input: {
        organizationId: ORGANIZATION_ID,
        capabilities: expectedCapabilities,
      },
    });
  });

  it('should render the explanation once the administrators are loaded', () => {
    // When
    renderMissingCapability();

    // Then
    expect(screen.getByText(TITLE)).toBeInTheDocument();
    expect(screen.getByText(DESCRIPTION)).toBeInTheDocument();
    expect(screen.getByText(ADMIN_LIST_TITLE)).toBeInTheDocument();
  });

  it.each(ADMINISTRATORS.usersWithCapabilitiesInOrganization)(
    'should list the administrator $email',
    ({ first_name, last_name, email }) => {
      // When
      renderMissingCapability();

      // Then
      expect(
        screen.getByText(`${first_name} ${last_name} - ${email}`)
      ).toBeInTheDocument();
    }
  );

  it('should render the loader while the administrators are loading', () => {
    // Given
    mocks.useUsersWithCapabilitiesInOrganizationQuery.mockReturnValue({
      data: undefined,
    });

    // When
    renderMissingCapability();

    // Then
    expect(screen.getByTestId(LOADER_TEST_ID)).toBeInTheDocument();
    expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
  });

  it.each([
    {
      case: 'send the error to the error page when the first load fails',
      data: undefined,
      expected: true,
    },
    {
      case: 'keep the administrators on screen when a background refetch fails',
      data: ADMINISTRATORS,
      expected: false,
    },
  ])('should $case', ({ data, expected }) => {
    // Given
    renderMissingCapability();

    // When
    const shouldThrow = lastQueryOptions().throwOnError(new Error(), {
      state: { data },
    });

    // Then
    expect(shouldThrow).toBe(expected);
  });

  it('should call cancel when the user clicks the back button', async () => {
    // Given
    const cancel = vi.fn();
    const { user } = renderMissingCapability({ cancel });

    // When
    await user.click(screen.getByRole('button', { name: BACK_LABEL }));

    // Then
    expect(cancel).toHaveBeenCalledOnce();
  });
});
