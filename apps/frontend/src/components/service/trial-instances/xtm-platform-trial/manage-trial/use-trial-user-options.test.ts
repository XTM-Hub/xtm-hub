import { toNewEmailEntry } from '@/components/service/trial-instances/xtm-platform-trial/manage-trial/manage-trial.const';
import { useTrialUserOptions } from '@/components/service/trial-instances/xtm-platform-trial/manage-trial/use-trial-user-options';
import { DEBOUNCE_TIME } from '@/utils/constant';
import { testRenderHook } from '@/utils/test/test-render';
import { UsersQueryVariables } from '@graphql/generated';
import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ACTIVE_USER = { id: 'user-1', email: 'active@filigran.io', status: null };
const OTHER_USER = { id: 'user-2', email: 'other@filigran.io', status: null };
const NEW_EMAIL = 'new@filigran.io';

const graphqlMocks = vi.hoisted(() => ({
  useUsersQuery: Object.assign(vi.fn(), {
    getKey: vi.fn((variables: unknown) => ['Users', variables]),
    getRootKey: vi.fn(() => ['Users']),
  }),
}));

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useUsersQuery: graphqlMocks.useUsersQuery,
}));

vi.mock('@/lib/graphql-client', () => ({
  portalGraphqlClient: { _mock: 'portalGraphqlClient' },
}));

const renderUseTrialUserOptions = () =>
  testRenderHook(() =>
    useTrialUserOptions({
      organizationId: 'org-1',
      bundleUsers: [],
      isTrialInviteEnabled: true,
      canInviteUsers: true,
      // Disables the organization domains query, covered by the form tests
      canInviteOutsideOrganizationDomains: true,
    })
  );

const search = (
  onUsersInputChange: ((value: string) => void) | undefined,
  value: string
) => {
  act(() => {
    onUsersInputChange?.(value);
    vi.advanceTimersByTime(DEBOUNCE_TIME);
  });
};

describe('useTrialUserOptions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    graphqlMocks.useUsersQuery.mockImplementation(
      (_client: unknown, { searchTerm }: UsersQueryVariables) => ({
        data: {
          users: {
            edges: [ACTIVE_USER, OTHER_USER]
              .filter(({ email }) => !searchTerm || email.includes(searchTerm))
              .map((node) => ({ node })),
          },
        },
        isSuccess: true,
        isPlaceholderData: false,
      })
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should keep a selected user option when it leaves the search results', () => {
    // Given
    const { result } = renderUseTrialUserOptions();
    act(() => result.current.onUsersChange([ACTIVE_USER.id]));

    // When
    search(result.current.onUsersInputChange, OTHER_USER.email);

    // Then
    expect(result.current.usersOptions).toEqual([
      { label: OTHER_USER.email, value: OTHER_USER.id },
      { label: ACTIVE_USER.email, value: ACTIVE_USER.id },
    ]);
  });

  it('should keep a selected invite entry when the search changes', () => {
    // Given
    const { result } = renderUseTrialUserOptions();
    search(result.current.onUsersInputChange, NEW_EMAIL);
    act(() => result.current.onUsersChange([toNewEmailEntry(NEW_EMAIL)]));

    // When
    search(result.current.onUsersInputChange, OTHER_USER.email);

    // Then
    expect(result.current.usersOptions).toContainEqual(
      expect.objectContaining({ value: toNewEmailEntry(NEW_EMAIL) })
    );
  });
});
