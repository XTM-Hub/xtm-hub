import { UserList_fragment$data } from '@generated/UserList_fragment.graphql';
import { screen } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import testRender from '@/utils/test/test-render';
import { PendingUserConfirmDialog } from './PendingUserConfirmDialog';

vi.mock('@/components/ui/ConfirmDialog', () => ({
  ConfirmDialog: ({
    open,
    onOpenChange,
    title,
    confirmLabel,
    onConfirm,
    children,
  }: {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    title: string;
    confirmLabel: string;
    onConfirm?: () => void;
    children: ReactNode;
  }) =>
    open ? (
      <div role="alertdialog">
        <h2>{title}</h2>
        <div>{children}</div>
        <button onClick={onConfirm}>{confirmLabel}</button>
        <button onClick={() => onOpenChange?.(false)}>Close</button>
      </div>
    ) : null,
}));

const pendingUser = {
  id: 'user-1',
  email: 'pending.user@filigran.io',
  first_name: 'Pending',
  last_name: 'User',
} as UserList_fragment$data;

describe('PendingUserConfirmDialog', () => {
  beforeEach(() => {
    const translate = (key: string, values?: Record<string, unknown>) =>
      values?.email ? `${key}:${values.email}` : key;
    vi.mocked(useTranslations).mockReturnValue(
      Object.assign(translate, {
        rich: translate,
      }) as unknown as ReturnType<typeof useTranslations>
    );
  });

  it('does not render when there is no dialog state', () => {
    testRender(
      <PendingUserConfirmDialog
        pendingUserDialog={null}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('renders approve translation keys and interpolated email', () => {
    testRender(
      <PendingUserConfirmDialog
        pendingUserDialog={{ action: 'approve', user: pendingUser }}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(
      screen.getByText('PendingUserListPage.WarningUserAccept.Title')
    ).toBeInTheDocument();
    expect(
      screen.getByText('PendingUserListPage.WarningUserAccept.Confirm')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        `PendingUserListPage.WarningUserAccept.Description:${pendingUser.email}`
      )
    ).toBeInTheDocument();
  });

  it('renders reject translation keys and triggers confirm/close handlers', async () => {
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn();
    const { user } = testRender(
      <PendingUserConfirmDialog
        pendingUserDialog={{ action: 'deny', user: pendingUser }}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />
    );

    expect(
      screen.getByText('PendingUserListPage.WarningUserRejection.Title')
    ).toBeInTheDocument();
    expect(
      screen.getByText('PendingUserListPage.WarningUserRejection.Confirm')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        `PendingUserListPage.WarningUserRejection.Description:${pendingUser.email}`
      )
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: 'PendingUserListPage.WarningUserRejection.Confirm',
      })
    );
    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
