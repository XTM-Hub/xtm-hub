import NewsFeedList from '@/components/admin/news-feed/NewsFeedList';
import testRender from '@/utils/test/test-render';
import { NewsFeedItemRowFragment, NewsFeedItemType } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  deleteMutate: vi.fn(),
  newsFeedItems: [] as NewsFeedItemRowFragment[],
}));

vi.mock('@/utils/date', () => ({
  useDateFormatter: () => (date: string) => `formatted:${date}`,
}));

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useNewsFeedListQuery: () => ({
    data: {
      newsFeedItems: {
        totalCount: mocks.newsFeedItems.length,
        edges: mocks.newsFeedItems.map((item) => ({ node: item })),
      },
    },
  }),
  useNewsFeedDeleteItemMutation: () => ({
    mutate: mocks.deleteMutate,
    isPending: false,
  }),
}));

vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

// Real IconActions on purpose: the keyboard behavior depends on the Radix menu
describe('NewsFeedList blog post delete action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    });
    mocks.newsFeedItems = [
      {
        id: 'item-1',
        title: 'Blog post news',
        type: NewsFeedItemType.BlogPost,
        creation_date: '2025-01-22T08:00:00.000Z',
        tags: [],
        is_deleted: false,
        metadata: [],
      },
    ];
  });

  it('exposes the reason to keyboard users and blocks the deletion', async () => {
    // Given
    const { user } = testRender(<NewsFeedList />);
    const trigger = screen.getByRole('button', { name: 'Utils.OpenMenu' });
    trigger.focus();

    // When
    await user.keyboard('{Enter}');
    await user.keyboard('{ArrowDown}');

    // Then
    const deleteItem = await screen.findByRole('menuitem', {
      name: 'NewsFeedAdminPage.Delete',
    });
    expect(deleteItem).toHaveFocus();
    expect(deleteItem).toHaveAttribute('aria-disabled', 'true');
    expect(deleteItem).toHaveAccessibleDescription(
      'NewsFeedAdminPage.DeleteBlogpostDisabled'
    );
    expect(
      await screen.findByRole('tooltip', {
        name: 'NewsFeedAdminPage.DeleteBlogpostDisabled',
      })
    ).toBeInTheDocument();

    await user.keyboard('{Enter}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mocks.deleteMutate).not.toHaveBeenCalled();
  });
});
