import NewsFeedList from '@/components/admin/news-feed/NewsFeedList';
import testRender from '@/utils/test/test-render';
import type { NewsFeedItemType } from '@generated/newsFeedItem_fragment.graphql';
import { act, screen, waitFor, within } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type NewsFeedItem = {
  id: string;
  title: string;
  type: NewsFeedItemType;
  creation_date: string;
  tags: string[];
  is_deleted: boolean;
  metadata: { key: string; value: string }[];
};

const mocks = vi.hoisted(() => ({
  refetch: vi.fn(),
  deleteMutation: vi.fn(),
  push: vi.fn(),
  newsFeedItems: [] as NewsFeedItem[],
}));

vi.mock('@/utils/date', () => ({
  useDateFormatter: () => (date: string) => `formatted:${date}`,
}));

vi.mock('@/utils/services', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/services')>()),
  localizedCardName: (instance: { name: string }) => instance.name,
}));

vi.mock('react-relay', async (importOriginal) => ({
  ...(await importOriginal()),
  useLazyLoadQuery: () => ({}),
  useRefetchableFragment: () => [
    {
      newsFeedItems: {
        totalCount: mocks.newsFeedItems.length,
        edges: mocks.newsFeedItems.map((item) => ({ node: item })),
      },
    },
    mocks.refetch,
  ],
  useMutation: () => [mocks.deleteMutation, false],
  readInlineData: (_fragment: unknown, node: unknown) => node,
}));

vi.mock('@/components/ui/IconActions', () => ({
  IconActions: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  IconActionsItem: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
}));

vi.mock('@/components/ui/AlertDialog', () => ({
  AlertDialogComponent: ({
    isOpen,
    onOpenChange,
    AlertTitle,
    actionButtonText,
    onClickContinue,
    children,
  }: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    AlertTitle: string;
    actionButtonText: string;
    onClickContinue: () => void;
    children: ReactNode;
  }) =>
    isOpen ? (
      <div role="alertdialog">
        <h2>{AlertTitle}</h2>
        <div>{children}</div>
        <button onClick={onClickContinue}>{actionButtonText}</button>
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
        type: 'RESOURCE_PLAYBOOK',
        creation_date: '2025-01-20T08:00:00.000Z',
        tags: ['tag-1', 'tag-2'],
        is_deleted: false,
        metadata: [{ key: 'url_path', value: 'news/active-news' }],
      },
      {
        id: 'item-2',
        title: 'Deleted news',
        type: 'RESOURCE_CUSTOM_DASHBOARD',
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

  it('navigates to the item url_path when a row is clicked', async () => {
    const { user } = testRender(<NewsFeedList />);

    await user.click(screen.getByText('Active news').closest('tr')!);
    expect(mocks.push).toHaveBeenCalledWith('/news/active-news');

    mocks.push.mockClear();
    await user.click(screen.getByText('Deleted news').closest('tr')!);
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('opens delete dialog and confirms deletion with success toast and refetch', async () => {
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

    expect(mocks.deleteMutation).toHaveBeenCalledOnce();

    const mutationConfig = mocks.deleteMutation.mock.calls[0]?.[0] as {
      variables: { id: string };
      onCompleted: () => void;
    };

    expect(mutationConfig.variables).toEqual({ id: 'item-1' });

    await act(async () => {
      mutationConfig.onCompleted();
    });

    await waitFor(() => {
      expect(mocks.refetch).toHaveBeenCalledWith(
        {
          count: 25,
          cursor: btoa('0'),
        },
        { fetchPolicy: 'store-and-network' }
      );
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

    const mutationConfig = mocks.deleteMutation.mock.calls[0]?.[0] as {
      onError: () => void;
    };

    await act(async () => {
      mutationConfig.onError();
    });

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  it('refetches with expected cursor and count on pagination change', async () => {
    mocks.newsFeedItems = Array.from({ length: 30 }, (_unused, index) => ({
      id: `item-${index + 1}`,
      title: `News ${index + 1}`,
      type: 'RESOURCE_PLAYBOOK',
      creation_date: '2025-01-20T08:00:00.000Z',
      tags: ['tag'],
      is_deleted: false,
      metadata: [],
    }));

    const { user } = testRender(<NewsFeedList />);

    await user.click(
      screen.getByRole('button', { name: 'Datatable.GoNextPage' })
    );

    await waitFor(() => {
      expect(mocks.refetch).toHaveBeenCalledWith(
        {
          count: 25,
          cursor: btoa('25'),
        },
        { fetchPolicy: 'store-and-network' }
      );
    });
  });
});
