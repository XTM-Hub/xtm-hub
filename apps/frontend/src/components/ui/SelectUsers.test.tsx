import SelectUsersFormField from '@/components/ui/SelectUsers';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const LABEL = 'Service.Form.Author';
const AUTHOR_ID = 'user-1';
const AUTHOR_EMAIL = 'author@filigran.io';
const UNLOADED_AUTHOR_ID = 'user-2';
const DEFAULT_AUTHOR_EMAIL = 'default-author@filigran.io';
const SEARCH_TERM = 'author';

const mocks = vi.hoisted(() => ({
  edges: [] as Array<{ node: { id: string; email: string } }>,
  refetch: vi.fn(),
}));

vi.mock('react-relay', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-relay')>()),
  readInlineData: (_fragment: unknown, node: unknown) => node,
}));

vi.mock('@/hooks/use-users-list', () => ({
  useUsersList: () => ({
    data: { users: { edges: mocks.edges } },
    refetch: mocks.refetch,
  }),
}));

// The debounce delay is not under test: searches run as soon as they are asked
vi.mock('usehooks-ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('usehooks-ts')>()),
  useDebounceCallback: (callback: unknown) => callback,
}));

describe('SelectUsersFormField', () => {
  beforeEach(() => {
    mocks.edges = [{ node: { id: AUTHOR_ID, email: AUTHOR_EMAIL } }];
    mocks.refetch.mockReset();
  });

  it('should display the default author when the form sets an unloaded id after mount', () => {
    // Given
    const { rerender } = testRender(
      <SelectUsersFormField
        label={LABEL}
        defaultValue={DEFAULT_AUTHOR_EMAIL}
        onValueChange={vi.fn()}
      />
    );
    const field = screen.getByRole('combobox', { name: LABEL });
    expect(field).toHaveValue('');

    // When
    rerender(
      <SelectUsersFormField
        label={LABEL}
        defaultValue={DEFAULT_AUTHOR_EMAIL}
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
    const { user } = testRender(
      <SelectUsersFormField
        label={LABEL}
        onValueChange={vi.fn()}
      />
    );

    // When
    await user.type(screen.getByRole('combobox', { name: LABEL }), SEARCH_TERM);

    // Then
    expect(mocks.refetch).toHaveBeenLastCalledWith(
      expect.objectContaining({ searchTerm: SEARCH_TERM })
    );
  });

  it('should not search the users when a user is picked', async () => {
    // Given
    const { user } = testRender(
      <SelectUsersFormField
        label={LABEL}
        onValueChange={vi.fn()}
      />
    );

    // When
    await user.click(screen.getByRole('combobox', { name: LABEL }));
    await user.click(await screen.findByRole('option', { name: AUTHOR_EMAIL }));

    // Then
    expect(mocks.refetch).not.toHaveBeenCalled();
  });
});
