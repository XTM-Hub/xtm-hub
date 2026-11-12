import SelectUsersFormField from '@/components/ui/SelectUsers';
import testRender from '@/utils/test/test-render';
import {
  OrderingMode,
  UserOrdering,
  UsersQuery,
  UsersQueryVariables,
} from '@graphql/generated';
import { keepPreviousData } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const LABEL = 'Service.Form.Author';
const AUTHOR_ID = 'user-1';
const AUTHOR_EMAIL = 'author@filigran.io';
const UNLOADED_AUTHOR_ID = 'user-2';
const DEFAULT_AUTHOR_EMAIL = 'default-author@filigran.io';
const DEFAULT_AUTHOR = {
  value: UNLOADED_AUTHOR_ID,
  label: DEFAULT_AUTHOR_EMAIL,
};
const SEARCH_TERM = 'author';
const LOADING_MESSAGE = 'Utils.Loading';

const FIRST_LOAD_VARIABLES: UsersQueryVariables = {
  first: 50,
  orderBy: UserOrdering.Email,
  orderMode: OrderingMode.Asc,
  searchTerm: '',
  filters: null,
};

type UsersQueryOptions = {
  placeholderData: unknown;
  throwOnError: (
    error: Error,
    query: { state: { data: UsersQuery | undefined } }
  ) => boolean;
};

const mocks = vi.hoisted(() => ({
  edges: [] as Array<{ node: { id: string; email: string } }>,
  isLoading: false,
  isPlaceholderData: false,
  usersQuery: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useUsersQuery: mocks.usersQuery,
  });
});

// The debounce delay is not under test: searches run as soon as they are asked
vi.mock('usehooks-ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('usehooks-ts')>()),
  useDebounceCallback: (callback: unknown) => callback,
}));

const lastQueryVariables = () =>
  mocks.usersQuery.mock.lastCall?.[1] as UsersQueryVariables;

const lastQueryOptions = () =>
  mocks.usersQuery.mock.lastCall?.[2] as UsersQueryOptions;

const renderSelectUsers = () =>
  testRender(
    <SelectUsersFormField
      label={LABEL}
      onValueChange={vi.fn()}
    />
  );

describe('SelectUsersFormField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.edges = [{ node: { id: AUTHOR_ID, email: AUTHOR_EMAIL } }];
    mocks.isLoading = false;
    mocks.isPlaceholderData = false;
    mocks.usersQuery.mockImplementation(() => ({
      data: { users: { edges: mocks.edges } },
      isLoading: mocks.isLoading,
      isPlaceholderData: mocks.isPlaceholderData,
    }));
  });

  it('should display the default author when the form sets an unloaded id after mount', () => {
    // Given
    const { rerender } = testRender(
      <SelectUsersFormField
        label={LABEL}
        defaultUser={DEFAULT_AUTHOR}
        onValueChange={vi.fn()}
      />
    );
    const field = screen.getByRole('combobox', { name: LABEL });
    expect(field).toHaveValue('');

    // When
    rerender(
      <SelectUsersFormField
        label={LABEL}
        defaultUser={DEFAULT_AUTHOR}
        value={UNLOADED_AUTHOR_ID}
        onValueChange={vi.fn()}
      />
    );

    // Then
    expect(field).toHaveValue(DEFAULT_AUTHOR_EMAIL);
  });

  it('should keep showing the picked user when a search drops them from the options', async () => {
    // Given
    const { user, rerender } = testRender(
      <SelectUsersFormField
        label={LABEL}
        onValueChange={vi.fn()}
      />
    );
    const field = screen.getByRole('combobox', { name: LABEL });
    await user.click(field);
    await user.click(await screen.findByRole('option', { name: AUTHOR_EMAIL }));

    // When
    mocks.edges = [];
    rerender(
      <SelectUsersFormField
        label={LABEL}
        value={AUTHOR_ID}
        onValueChange={vi.fn()}
      />
    );

    // Then
    expect(field).toHaveValue(AUTHOR_EMAIL);
  });

  it('should hand the picked user id to the form when a user is picked', async () => {
    // Given
    const onValueChange = vi.fn();
    const { user } = testRender(
      <SelectUsersFormField
        label={LABEL}
        onValueChange={onValueChange}
      />
    );

    // When
    await user.click(screen.getByRole('combobox', { name: LABEL }));
    await user.click(await screen.findByRole('option', { name: AUTHOR_EMAIL }));

    // Then
    expect(onValueChange).toHaveBeenCalledWith(AUTHOR_ID);
  });

  it('should hand an empty id to the form when the field is cleared', async () => {
    // Given
    const onValueChange = vi.fn();
    const { user } = testRender(
      <SelectUsersFormField
        label={LABEL}
        value={AUTHOR_ID}
        onValueChange={onValueChange}
      />
    );

    // When
    await user.click(screen.getByRole('button', { name: 'Utils.Clear' }));

    // Then
    expect(onValueChange).toHaveBeenCalledWith('');
  });

  it('should search the users with the typed text when the user types', async () => {
    // Given
    const { user } = renderSelectUsers();

    // When
    await user.type(screen.getByRole('combobox', { name: LABEL }), SEARCH_TERM);

    // Then
    expect(lastQueryVariables()).toEqual(
      expect.objectContaining({ searchTerm: SEARCH_TERM })
    );
  });

  it('should not search the users when a user is picked', async () => {
    // Given
    const { user } = renderSelectUsers();

    // When
    await user.click(screen.getByRole('combobox', { name: LABEL }));
    await user.click(await screen.findByRole('option', { name: AUTHOR_EMAIL }));

    // Then
    expect(lastQueryVariables()).toEqual(FIRST_LOAD_VARIABLES);
  });

  it('should first load 50 users in the stored order', () => {
    // When
    renderSelectUsers();

    // Then
    expect(lastQueryVariables()).toEqual(FIRST_LOAD_VARIABLES);
  });

  it('should load 10 users once the user has searched, even after clearing the search', async () => {
    // Given
    const { user } = renderSelectUsers();
    const field = screen.getByRole('combobox', { name: LABEL });
    await user.type(field, SEARCH_TERM);

    // When
    await user.clear(field);

    // Then
    expect(lastQueryVariables()).toEqual({
      ...FIRST_LOAD_VARIABLES,
      first: 10,
      searchTerm: '',
    });
  });

  it('should keep the current options on screen while a search loads', () => {
    // When
    renderSelectUsers();

    // Then
    expect(lastQueryOptions().placeholderData).toBe(keepPreviousData);
  });

  it.each([
    {
      case: 'send the error to the error page when the first load fails',
      data: undefined,
      expected: true,
    },
    {
      case: 'keep the options when a background refetch fails',
      data: { users: { edges: [] } },
      expected: false,
    },
  ])('should $case', ({ data, expected }) => {
    // Given
    renderSelectUsers();

    // When
    const shouldThrow = lastQueryOptions().throwOnError(new Error(), {
      state: { data },
    });

    // Then
    expect(shouldThrow).toBe(expected);
  });

  it('should tell the user the options are loading', async () => {
    // Given
    mocks.edges = [];
    mocks.isLoading = true;
    const { user } = renderSelectUsers();

    // When
    await user.click(screen.getByRole('combobox', { name: LABEL }));

    // Then
    expect(await screen.findByText(LOADING_MESSAGE)).toBeInTheDocument();
  });

  it('should tell the user the options are loading while a search runs', async () => {
    // Given
    mocks.isPlaceholderData = true;
    const { user } = renderSelectUsers();

    // When
    await user.click(screen.getByRole('combobox', { name: LABEL }));

    // Then
    expect(await screen.findByText(LOADING_MESSAGE)).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: AUTHOR_EMAIL })
    ).not.toBeInTheDocument();
  });
});
