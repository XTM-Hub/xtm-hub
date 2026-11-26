import { screen } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import testRender from '@/utils/test/test-render';
import { PendingUserAlreadyProcessedDialog } from './PendingUserAlreadyProcessedDialog';

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

describe('PendingUserAlreadyProcessedDialog', () => {
  beforeEach(() => {
    vi.mocked(useTranslations).mockReturnValue((key) => key);
  });

  it('does not render when closed', () => {
    testRender(
      <PendingUserAlreadyProcessedDialog
        isOpen={false}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('renders translation keys and closes on confirm', async () => {
    const onOpenChange = vi.fn();
    const { user } = testRender(
      <PendingUserAlreadyProcessedDialog
        isOpen={true}
        onOpenChange={onOpenChange}
      />
    );

    expect(
      screen.getByText('PendingUserListPage.AlreadyProcessed.Title')
    ).toBeInTheDocument();
    expect(
      screen.getByText('PendingUserListPage.AlreadyProcessed.Description')
    ).toBeInTheDocument();
    expect(
      screen.getByText('PendingUserListPage.AlreadyProcessed.Confirm')
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: 'PendingUserListPage.AlreadyProcessed.Confirm',
      })
    );

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes when the close handler fires', async () => {
    const onOpenChange = vi.fn();
    const { user } = testRender(
      <PendingUserAlreadyProcessedDialog
        isOpen={true}
        onOpenChange={onOpenChange}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
