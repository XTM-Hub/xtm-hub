import { OrganizationMembersList } from '@/components/organization/members/OrganizationMembersList';
import { toCursor } from '@/hooks/use-table-pagination';
import { formatName } from '@/utils/format/name';
import testRender from '@/utils/test/test-render';
import {
  OrganizationCapability,
  type OrganizationMembersQuery,
  type OrganizationMembersQueryVariables,
} from '@graphql/generated';
import { act, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useOrganizationMembersQuery: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useOrganizationMembersQuery: mocks.useOrganizationMembersQuery,
}));

vi.mock('@/lib/graphql-client', () => ({
  portalGraphqlClient: { _mock: 'portalGraphqlClient' },
}));

// The search applies at once instead of after the typing pause
vi.mock('usehooks-ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('usehooks-ts')>()),
  useDebounceCallback: (callback: (value: string) => void) =>
    Object.assign((value: string) => callback(value), { cancel: () => {} }),
}));

type User = ReturnType<typeof testRender>['user'];
type QueryOptions = {
  retry: (failureCount: number, error: unknown) => boolean;
  throwOnError: (
    error: unknown,
    query: { state: { data: unknown } }
  ) => boolean;
};

const ROUTE_ORGANIZATION_ID = 'T3JnYW5pemF0aW9uOnJvdXRl';
const SELECTED_ORGANIZATION_ID = 'selected-organization';
const TOTAL_COUNT = 120;
const DEFAULT_PAGE_SIZE = 50;
const LARGER_PAGE_SIZE = 100;
const SEARCH_TERM = 'ali';
const NOT_FOUND_MESSAGE = 'Error.Server.ORGANIZATION_NOT_FOUND';
const NO_MEMBERS_MESSAGE = 'UserListPage.NoUsers';
const NO_MEMBERS: OrganizationMembersQuery = {
  organizationMembers: { totalCount: 0, edges: [] },
};
const MEMBER_LABEL_KEY = 'UserListPage.Member';
const NEXT_PAGE_LABEL = 'DesignSystem.DataTable.NextPage';
const MANAGE_COLUMNS_LABEL = 'DesignSystem.DataTable.ManageColumns';
const ROWS_PER_PAGE_LABEL = 'DesignSystem.DataTable.RowsPerPage';
const COLUMNS_LABEL = 'DesignSystem.DataTable.Columns';
const RESET_TABLE_LABEL = 'DesignSystem.DataTable.ResetTable';
const PAGE_SIZE_KEY = 'pageSizeOrganizationMembersList';
const COLUMN_VISIBILITY_KEY = 'columnVisibilityOrganizationMembersList';
const UNOFFERED_PAGE_SIZE = 200;
const HIDDEN_COLUMN_ID = 'first_name';
const SEARCH_LABEL = 'UserActions.SearchUser';
const ORGANIZATION_NOT_FOUND_ERROR = new Error('ORGANIZATION_NOT_FOUND');
const NOT_FOUND_ERROR = new Error('NOT_FOUND');
const OTHER_ERROR = new Error('boom');
const EMAIL_HEADER = 'UserListPage.Email';
const FIRST_NAME_HEADER = 'UserListPage.FirstName';
const LAST_NAME_HEADER = 'UserListPage.LastName';
const ROLES_HEADER = 'UserListPage.Roles';
const HEADERS = [
  EMAIL_HEADER,
  FIRST_NAME_HEADER,
  LAST_NAME_HEADER,
  ROLES_HEADER,
];
const ROLES_COLUMN_INDEX = HEADERS.indexOf(ROLES_HEADER);
const CLEAR_SEARCH_LABEL = 'DesignSystem.SearchField.Clear';
const FIRST_PAGE_RANGE = `1 - ${DEFAULT_PAGE_SIZE}`;
const OFFERED_PAGE_SIZES = [DEFAULT_PAGE_SIZE, LARGER_PAGE_SIZE];
const PAGE_SIZE_ITEM_TEXT = /^\d+$/;
const MEMBER_WITHOUT_CAPABILITY = {
  __typename: 'OrganizationMember' as const,
  id: 'VXNlcjpib2I=',
  email: 'bob@filigran.io',
  first_name: 'Bob',
  last_name: 'Martin',
  capabilities: [],
};
const ADMINISTRATOR = {
  ...MEMBER_WITHOUT_CAPABILITY,
  id: 'VXNlcjphbGljZQ==',
  email: 'alice@filigran.io',
  first_name: 'Alice',
  last_name: 'Liddell',
  capabilities: [OrganizationCapability.AdministrateOrganization],
};
const MEMBER_WITH_SEVERAL_CAPABILITIES = {
  ...MEMBER_WITHOUT_CAPABILITY,
  id: 'VXNlcjpjYXJvbA==',
  email: 'carol@filigran.io',
  first_name: null,
  last_name: null,
  capabilities: [
    OrganizationCapability.ManageAccess,
    OrganizationCapability.ManageSubscription,
  ],
};

const membersData = (
  nodes = [
    ADMINISTRATOR,
    MEMBER_WITHOUT_CAPABILITY,
    MEMBER_WITH_SEVERAL_CAPABILITIES,
  ]
): OrganizationMembersQuery => ({
  organizationMembers: {
    totalCount: TOTAL_COUNT,
    edges: nodes.map((node) => ({ node })),
  },
});

const renderList = () =>
  testRender(
    <OrganizationMembersList organizationId={ROUTE_ORGANIZATION_ID} />,
    {
      me: { selected_organization_id: SELECTED_ORGANIZATION_ID },
    }
  );

const lastVariables = (): OrganizationMembersQueryVariables =>
  mocks.useOrganizationMembersQuery.mock.lastCall?.[1];

const firstOptions = (): QueryOptions =>
  mocks.useOrganizationMembersQuery.mock.calls[0]?.[2];

const goToNextPage = (user: User) =>
  user.click(screen.getByRole('button', { name: NEXT_PAGE_LABEL }));

const typeSearch = (user: User) =>
  user.type(screen.getByRole('searchbox', { name: SEARCH_LABEL }), SEARCH_TERM);

const getRowOf = (email: string) => screen.getByText(email).closest('tr')!;

const getCellTextsOf = (email: string) =>
  within(getRowOf(email))
    .getAllByRole('cell')
    .map((cell) => cell.textContent);

const getRolesCellOf = (email: string) =>
  within(getRowOf(email)).getAllByRole('cell')[ROLES_COLUMN_INDEX]!;

const getHeaderTexts = () =>
  screen.getAllByRole('columnheader').map((header) => header.textContent);

const firstVariables = (): OrganizationMembersQueryVariables =>
  mocks.useOrganizationMembersQuery.mock.calls[0]?.[1];

const getStoredValue = (key: string) =>
  JSON.parse(window.localStorage.getItem(key) ?? 'null');

const openTableMenuItem = async (user: User, label: string) => {
  await user.click(screen.getByRole('button', { name: MANAGE_COLUMNS_LABEL }));
  await user.click(await screen.findByRole('menuitem', { name: label }));
};

// A pointer move off the sub-menu trigger closes the sub-menu in jsdom, so its item is picked with the keyboard.
const pickSubMenuItem = async (user: User, name: string) => {
  const item = await screen.findByRole('menuitem', { name });
  act(() => item.focus());
  await user.keyboard('{Enter}');
};

describe('OrganizationMembersList', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mocks.useOrganizationMembersQuery.mockReset();
    mocks.useOrganizationMembersQuery.mockReturnValue({
      data: membersData(),
      error: null,
      isLoading: false,
    });
  });

  describe('variables', () => {
    it('should ask for the first page of the route organization, not the selected one', () => {
      // Given / When
      renderList();

      // Then
      expect(lastVariables()).toEqual({
        organizationId: ROUTE_ORGANIZATION_ID,
        first: DEFAULT_PAGE_SIZE,
        after: toCursor(DEFAULT_PAGE_SIZE, 0),
        searchTerm: null,
      });
    });

    it('should ask for the next page with the table cursor when next is clicked', async () => {
      // Given
      const { user } = renderList();

      // When
      await goToNextPage(user);

      // Then
      expect(lastVariables().after).toBe(toCursor(DEFAULT_PAGE_SIZE, 1));
    });

    it('should ask for 100 members when 100 rows per page is picked', async () => {
      // Given
      const { user } = renderList();
      await openTableMenuItem(user, ROWS_PER_PAGE_LABEL);

      // When
      await pickSubMenuItem(user, String(LARGER_PAGE_SIZE));

      // Then
      expect(lastVariables().first).toBe(LARGER_PAGE_SIZE);
    });
  });

  describe('stored settings', () => {
    it.each([
      { storedPageSize: LARGER_PAGE_SIZE, expectedFirst: LARGER_PAGE_SIZE },
      { storedPageSize: UNOFFERED_PAGE_SIZE, expectedFirst: DEFAULT_PAGE_SIZE },
    ])(
      'should ask for $expectedFirst members on the first render when $storedPageSize is stored',
      ({ storedPageSize, expectedFirst }) => {
        // Given
        window.localStorage.setItem(
          PAGE_SIZE_KEY,
          JSON.stringify(storedPageSize)
        );

        // When
        renderList();

        // Then
        expect(firstVariables().first).toBe(expectedFirst);
      }
    );

    it('should store a column hidden from the table menu', async () => {
      // Given
      const { user } = renderList();
      await openTableMenuItem(user, COLUMNS_LABEL);

      // When
      await pickSubMenuItem(user, HIDDEN_COLUMN_ID);

      // Then
      expect(getStoredValue(COLUMN_VISIBILITY_KEY)).toEqual({
        [HIDDEN_COLUMN_ID]: false,
      });
    });
  });

  describe('reset', () => {
    it('should ask for the first page of 50 members again when the table is reset after a switch to 100 rows', async () => {
      // Given
      const { user } = renderList();
      await openTableMenuItem(user, ROWS_PER_PAGE_LABEL);
      await pickSubMenuItem(user, String(LARGER_PAGE_SIZE));
      await goToNextPage(user);

      // When
      await openTableMenuItem(user, RESET_TABLE_LABEL);

      // Then
      expect(lastVariables()).toMatchObject({
        first: DEFAULT_PAGE_SIZE,
        after: toCursor(DEFAULT_PAGE_SIZE, 0),
      });
    });
  });

  describe('search', () => {
    it('should send the typed term', async () => {
      // Given
      const { user } = renderList();

      // When
      await typeSearch(user);

      // Then
      expect(lastVariables().searchTerm).toBe(SEARCH_TERM);
    });

    it('should come back to the first page when a search follows a page change', async () => {
      // Given
      const { user } = renderList();
      await goToNextPage(user);

      // When
      await typeSearch(user);

      // Then
      expect(lastVariables().after).toBe(toCursor(DEFAULT_PAGE_SIZE, 0));
    });

    it('should send no term once the search is cleared', async () => {
      // Given
      const { user } = renderList();
      await typeSearch(user);

      // When
      await user.click(
        screen.getByRole('button', { name: CLEAR_SEARCH_LABEL })
      );

      // Then
      expect(lastVariables().searchTerm).toBeNull();
    });
  });

  describe('no members', () => {
    it('should say no member matches when a search finds none', async () => {
      // Given
      mocks.useOrganizationMembersQuery.mockImplementation(
        (_client, variables: OrganizationMembersQueryVariables) => ({
          data:
            variables.searchTerm === SEARCH_TERM ? NO_MEMBERS : membersData(),
          error: null,
          isLoading: false,
          isPlaceholderData: false,
        })
      );
      const { user } = renderList();

      // When
      await typeSearch(user);

      // Then
      expect(screen.getByText(NO_MEMBERS_MESSAGE)).toBeInTheDocument();
    });

    it.each([
      {
        description: 'the first page loads',
        result: {
          data: undefined,
          error: null,
          isLoading: true,
          isPlaceholderData: false,
        },
      },
      {
        description: 'a search runs over an empty result kept on screen',
        result: {
          data: NO_MEMBERS,
          error: null,
          isLoading: false,
          isPlaceholderData: true,
        },
      },
    ])('should not say no member matches while $description', ({ result }) => {
      // Given
      mocks.useOrganizationMembersQuery.mockReturnValue(result);

      // When
      renderList();

      // Then
      expect(screen.queryByText(NO_MEMBERS_MESSAGE)).not.toBeInTheDocument();
    });
  });

  describe('organization not found', () => {
    it.each([ORGANIZATION_NOT_FOUND_ERROR, NOT_FOUND_ERROR])(
      'should tell the organization was not found when the API throws $message',
      (error) => {
        // Given
        mocks.useOrganizationMembersQuery.mockReturnValue({
          data: undefined,
          error,
          isLoading: false,
        });

        // When
        renderList();

        // Then
        expect(screen.getByText(NOT_FOUND_MESSAGE)).toBeInTheDocument();
      }
    );

    it.each([ORGANIZATION_NOT_FOUND_ERROR, NOT_FOUND_ERROR])(
      'should not render the table when the API throws $message',
      (error) => {
        // Given
        mocks.useOrganizationMembersQuery.mockReturnValue({
          data: undefined,
          error,
          isLoading: false,
        });

        // When
        renderList();

        // Then
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
      }
    );

    it.each([
      {
        description: 'not retry a missing organization',
        decide: ({ retry }: QueryOptions) =>
          retry(0, ORGANIZATION_NOT_FOUND_ERROR),
        expected: false,
      },
      {
        description: 'not retry an organization the caller may not read',
        decide: ({ retry }: QueryOptions) => retry(0, NOT_FOUND_ERROR),
        expected: false,
      },
      {
        description: 'retry an unexpected failure',
        decide: ({ retry }: QueryOptions) => retry(0, OTHER_ERROR),
        expected: true,
      },
      {
        description: 'keep a missing organization off the error page',
        decide: ({ throwOnError }: QueryOptions) =>
          throwOnError(ORGANIZATION_NOT_FOUND_ERROR, {
            state: { data: undefined },
          }),
        expected: false,
      },
      {
        description:
          'keep an organization the caller may not read off the error page',
        decide: ({ throwOnError }: QueryOptions) =>
          throwOnError(NOT_FOUND_ERROR, { state: { data: undefined } }),
        expected: false,
      },
      {
        description:
          'send an unexpected failure of the first load to the error page',
        decide: ({ throwOnError }: QueryOptions) =>
          throwOnError(OTHER_ERROR, { state: { data: undefined } }),
        expected: true,
      },
    ])('should $description', ({ decide, expected }) => {
      // Given
      renderList();

      // When
      const decision = decide(firstOptions());

      // Then
      expect(decision).toBe(expected);
    });
  });

  describe('columns', () => {
    it('should render the email, first name, last name and roles headers in that order', () => {
      // Given / When
      renderList();

      // Then
      expect(getHeaderTexts()).toEqual(HEADERS);
    });
  });

  describe('pagination', () => {
    it('should count the rows from the total count', () => {
      // Given / When
      renderList();

      // Then
      expect(
        screen.getByText(FIRST_PAGE_RANGE).parentElement
      ).toHaveTextContent(`${FIRST_PAGE_RANGE} / ${TOTAL_COUNT}`);
    });

    it('should offer only 50 and 100 rows per page', async () => {
      // Given
      const { user } = renderList();

      // When
      await openTableMenuItem(user, ROWS_PER_PAGE_LABEL);

      // Then
      await screen.findByRole('menuitem', { name: String(DEFAULT_PAGE_SIZE) });
      expect(
        screen
          .getAllByRole('menuitem')
          .map((item) => item.textContent)
          .filter((text) => PAGE_SIZE_ITEM_TEXT.test(text ?? ''))
      ).toEqual(OFFERED_PAGE_SIZES.map(String));
    });
  });

  describe('rows', () => {
    it.each([ADMINISTRATOR, MEMBER_WITHOUT_CAPABILITY])(
      'should render the email, first name and last name of $email in their columns',
      ({ email, first_name, last_name }) => {
        // Given / When
        renderList();

        // Then
        expect(getCellTextsOf(email).slice(0, ROLES_COLUMN_INDEX)).toEqual([
          email,
          first_name,
          last_name,
        ]);
      }
    );

    it.each([
      {
        email: ADMINISTRATOR.email,
        label: formatName(OrganizationCapability.AdministrateOrganization),
      },
      {
        email: MEMBER_WITH_SEVERAL_CAPABILITIES.email,
        label: formatName(OrganizationCapability.ManageAccess),
      },
      {
        email: MEMBER_WITH_SEVERAL_CAPABILITIES.email,
        label: formatName(OrganizationCapability.ManageSubscription),
      },
    ])(
      'should show the "$label" badge in the roles of $email',
      ({ email, label }) => {
        // Given / When
        renderList();

        // Then
        expect(
          within(getRolesCellOf(email)).getByText(label)
        ).toBeInTheDocument();
      }
    );

    it('should show the Member badge for a member holding no capability', () => {
      // Given / When
      renderList();

      // Then
      expect(
        within(getRolesCellOf(MEMBER_WITHOUT_CAPABILITY.email)).getByText(
          formatName(MEMBER_LABEL_KEY)
        )
      ).toBeInTheDocument();
    });
  });
});
