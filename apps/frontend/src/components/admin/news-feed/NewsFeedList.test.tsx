import NewsFeedList from '@/components/admin/news-feed/NewsFeedList';
import { ServiceSlug } from '@/utils/shareable-resources/shareable-resources.types';
import testRender from '@/utils/test/test-render';
import {
  NewsFeedItemMetadataKey,
  NewsFeedItemRowFragment,
  NewsFeedItemType,
} from '@graphql/generated';
import { act, screen, waitFor, within } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  deleteMutate: vi.fn(),
  listQuery: vi.fn(),
  push: vi.fn(),
  newsFeedItems: [] as NewsFeedItemRowFragment[],
}));

vi.mock('@/utils/date', () => ({
  useDateFormatter: () => (date: string) => `formatted:${date}`,
}));

vi.mock('@/utils/services', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/services')>()),
  localizedCardName: (instance: { name: string }) => instance.name,
}));

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useNewsFeedListQuery: (...args: unknown[]) => {
    mocks.listQuery(...args);
    return {
      data: {
        newsFeedItems: {
          totalCount: mocks.newsFeedItems.length,
          edges: mocks.newsFeedItems.map((item) => ({ node: item })),
        },
      },
    };
  },
  useNewsFeedDeleteItemMutation: () => ({
    mutate: mocks.deleteMutate,
    isPending: false,
  }),
}));

vi.mock('@graphql/news-feed/news-feed.keys', () => ({
  newsFeedKeys: { all: () => ['NewsFeedList'] },
}));

vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));

vi.mock('@/components/ui/IconActions', () => ({
  IconActions: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  IconActionsItem: ({
    children,
    onClick,
    disabled,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/ConfirmDialog', () => ({
  ConfirmDialog: ({
    open,
    onOpenChange,
    title,
    confirmLabel,
    onConfirm,
    children,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    confirmLabel: string;
    onConfirm: () => void;
    children: ReactNode;
  }) =>
    open ? (
      <div role="alertdialog">
        <h2>{title}</h2>
        <div>{children}</div>
        <button onClick={onConfirm}>{confirmLabel}</button>
        <button onClick={() => onOpenChange(false)}>Cancel</button>
      </div>
    ) : null,
}));

vi.mock('@/components/ui/BadgeOverflowCounter', () => ({
  default: ({ badges }: { badges: Array<{ id: string; name: string }> }) => (
    <div>
      {badges.map((badge) => (
        <span key={badge.id}>{badge.name}</span>
      ))}
    </div>
  ),
}));

describe('NewsFeedList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      push: mocks.push,
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    });
    mocks.newsFeedItems = [
      {
        id: 'item-1',
        title: 'Active news',
        type: NewsFeedItemType.ResourcePlaybook,
        creation_date: '2025-01-20T08:00:00.000Z',
        tags: ['tag-1', 'tag-2'],
        is_deleted: false,
        metadata: [
          { key: NewsFeedItemMetadataKey.UrlPath, value: 'news/active-news' },
        ],
      },
      {
        id: 'item-2',
        title: 'Deleted news',
        type: NewsFeedItemType.ResourceCustomDashboard,
        creation_date: '2025-01-21T08:00:00.000Z',
        tags: ['tag-3'],
        is_deleted: true,
        metadata: [],
      },
    ];
  });

  it('renders rows and columns with deleted badge and action visibility rules', () => {
    testRender(<NewsFeedList />);

    expect(screen.getByText('NewsFeedAdminPage.Title')).toBeInTheDocument();
    expect(
      screen.getByText('NewsFeedAdminPage.CreationDate')
    ).toBeInTheDocument();
    expect(screen.getByText('NewsFeedAdminPage.Tags')).toBeInTheDocument();
    expect(screen.getByText('NewsFeedAdminPage.IsDeleted')).toBeInTheDocument();
    expect(screen.getByText('NewsFeedAdminPage.Library')).toBeInTheDocument();

    expect(screen.getByText('Active news')).toBeInTheDocument();
    expect(screen.getByText('Deleted news')).toBeInTheDocument();
    expect(
      screen.getByText('formatted:2025-01-20T08:00:00.000Z')
    ).toBeInTheDocument();
    expect(screen.getByText('tag-1')).toBeInTheDocument();
    expect(screen.getByText('tag-2')).toBeInTheDocument();

    expect(
      screen.getByText('NewsFeedAdminPage.IsDeletedYes')
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: 'NewsFeedAdminPage.Delete' })
    ).toHaveLength(1);
  });

  it('renders the blogpost label instead of a library label for a blog post row', () => {
    mocks.newsFeedItems = [
      {
        id: 'item-3',
        title: 'Blog post news',
        type: NewsFeedItemType.BlogPost,
        creation_date: '2025-01-22T08:00:00.000Z',
        tags: ['tag-4'],
        is_deleted: false,
        metadata: [],
      },
    ];

    testRender(<NewsFeedList />);

    const row = screen.getByText('Blog post news').closest('tr')!;
    expect(
      within(row).getByText('formatted:2025-01-22T08:00:00.000Z')
    ).toBeInTheDocument();
    expect(within(row).getByText('tag-4')).toBeInTheDocument();
    expect(
      within(row).getByText('NewsFeedAdminPage.Blogpost')
    ).toBeInTheDocument();
    expect(within(row).queryByText('—')).not.toBeInTheDocument();
    expect(row).not.toHaveTextContent(
      new RegExp(Object.values(ServiceSlug).join('|'))
    );
  });

  it('renders the library label of a resource item', () => {
    testRender(<NewsFeedList />);

    const row = screen.getByText('Active news').closest('tr')!;
    expect(
      within(row).getByText(ServiceSlug.OPEN_CTI_PLAYBOOKS)
    ).toBeInTheDocument();
  });

  it('renders the library label of a scenario item', () => {
    mocks.newsFeedItems = [
      {
        id: 'item-4',
        title: 'Scenario news',
        type: NewsFeedItemType.ResourceScenario,
        creation_date: '2025-01-23T08:00:00.000Z',
        tags: [],
        is_deleted: false,
        metadata: [],
      },
    ];

    testRender(<NewsFeedList />);

    const row = screen.getByText('Scenario news').closest('tr')!;
    expect(
      within(row).getByText(ServiceSlug.OPEN_AEV_SCENARIOS)
    ).toBeInTheDocument();
    expect(within(row).queryByText('—')).not.toBeInTheDocument();
  });

  it('navigates to the item url_path when a row is clicked', async () => {
    const { user } = testRender(<NewsFeedList />);

    await user.click(screen.getByText('Active news').closest('tr')!);
    expect(mocks.push).toHaveBeenCalledWith('/news/active-news');

    mocks.push.mockClear();
    await user.click(screen.getByText('Deleted news').closest('tr')!);
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('opens delete dialog and confirms deletion with success toast and list invalidation', async () => {
    const { user } = testRender(<NewsFeedList />);

    await user.click(
      screen.getByRole('button', { name: 'NewsFeedAdminPage.Delete' })
    );

    const dialog = await screen.findByRole('alertdialog');
    expect(
      within(dialog).getByText('NewsFeedAdminPage.DeleteDialog.Text')
    ).toBeInTheDocument();

    await user.click(
      within(dialog).getByRole('button', {
        name: 'NewsFeedAdminPage.DeleteDialog.Confirm',
      })
    );

    expect(mocks.deleteMutate).toHaveBeenCalledOnce();

    const [variables, callbacks] = mocks.deleteMutate.mock.calls[0] as [
      { id: string },
      { onSuccess: () => Promise<void> },
    ];

    expect(variables).toEqual({ id: 'item-1' });

    await act(async () => {
      await callbacks.onSuccess();
    });

    await waitFor(() => {
      expect(mocks.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['NewsFeedList'],
      });
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  it('shows destructive toast and closes dialog when deletion fails', async () => {
    const { user } = testRender(<NewsFeedList />);

    await user.click(
      screen.getByRole('button', { name: 'NewsFeedAdminPage.Delete' })
    );

    const dialog = await screen.findByRole('alertdialog');
    await user.click(
      within(dialog).getByRole('button', {
        name: 'NewsFeedAdminPage.DeleteDialog.Confirm',
      })
    );

    const callbacks = mocks.deleteMutate.mock.calls[0]?.[1] as {
      onError: () => void;
    };

    await act(async () => {
      callbacks.onError();
    });

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  it('queries with expected cursor and count on pagination change', async () => {
    mocks.newsFeedItems = Array.from({ length: 30 }, (_unused, index) => ({
      id: `item-${index + 1}`,
      title: `News ${index + 1}`,
      type: NewsFeedItemType.ResourcePlaybook,
      creation_date: '2025-01-20T08:00:00.000Z',
      tags: ['tag'],
      is_deleted: false,
      metadata: [],
    }));

    const { user } = testRender(<NewsFeedList />);

    await user.click(
      screen.getByRole('button', { name: 'DesignSystem.DataTable.NextPage' })
    );

    await waitFor(() => {
      expect(mocks.listQuery).toHaveBeenLastCalledWith(
        expect.anything(),
        { count: 25, cursor: btoa('25') },
        expect.anything()
      );
    });
  });
});
