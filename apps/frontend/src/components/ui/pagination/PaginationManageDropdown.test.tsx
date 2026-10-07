import { PaginationManageDropdown } from '@/components/ui/pagination/PaginationManageDropdown';
import testRender from '@/utils/test/test-render';
import { act, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const CURRENT_PAGE_SIZE = 100;
const OTHER_PAGE_SIZE = 50;
const LARGEST_PAGE_SIZE = 500;
const PICKED_PAGE_SIZE = 300;

// jsdom lays every element out at zero size, so Radix closes a sub-menu as soon
// as the pointer leaves its trigger: rows are focused rather than hovered.
const openRowsPerPage = async (user: ReturnType<typeof testRender>['user']) => {
  await user.click(
    screen.getByRole('button', { name: 'GenericActions.Paginate.Manage' })
  );
  await user.click(
    await screen.findByRole('menuitem', {
      name: 'GenericActions.Paginate.RowsPerPage',
    })
  );
};

describe('PaginationManageDropdown', () => {
  it.each([
    { size: CURRENT_PAGE_SIZE, expectedAriaCurrent: 'true' },
    { size: OTHER_PAGE_SIZE, expectedAriaCurrent: null },
    { size: LARGEST_PAGE_SIZE, expectedAriaCurrent: null },
  ])(
    `should set aria-current to $expectedAriaCurrent when the row is $size and the page size is ${CURRENT_PAGE_SIZE}`,
    async ({ size, expectedAriaCurrent }) => {
      // Given
      const { user } = testRender(
        <PaginationManageDropdown
          pageSize={CURRENT_PAGE_SIZE}
          onSetPageSize={vi.fn()}
        />
      );

      // When
      await openRowsPerPage(user);
      const row = await screen.findByRole('menuitem', { name: String(size) });

      // Then
      expect(row.getAttribute('aria-current')).toBe(expectedAriaCurrent);
    }
  );

  it('should call onSetPageSize with the picked size when another page size is picked', async () => {
    // Given
    const onSetPageSize = vi.fn();
    const { user } = testRender(
      <PaginationManageDropdown
        pageSize={CURRENT_PAGE_SIZE}
        onSetPageSize={onSetPageSize}
      />
    );

    // When
    await openRowsPerPage(user);
    const row = await screen.findByRole('menuitem', {
      name: String(PICKED_PAGE_SIZE),
    });
    act(() => row.focus());
    await user.keyboard('{Enter}');

    // Then
    expect(onSetPageSize).toHaveBeenCalledExactlyOnceWith(PICKED_PAGE_SIZE);
  });
});
