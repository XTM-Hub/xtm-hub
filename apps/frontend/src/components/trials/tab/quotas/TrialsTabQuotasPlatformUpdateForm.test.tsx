import { TrialsTabQuotasPlatformUpdateForm } from '@/components/trials/tab/quotas/TrialsTabQuotasPlatformUpdateForm';
import {
  CANCEL_LABEL,
  confirmCapacity,
  CURRENT_CAPACITY,
  getCapacityInput,
  mockQuotaUpdate,
  NEW_CAPACITY,
  QUOTA,
  QUOTA_REGION,
  QUOTA_REGION_LABEL,
  SERVER_ERROR,
  SHEET_TITLE,
  submitCapacity,
  typeCapacity,
  VALIDATE_LABEL,
} from '@/components/trials/tab/quotas/TrialsTabQuotasPlatformUpdateForm.test-utils';
import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import {
  mockTranslations,
  translateWithValues,
} from '@/utils/test/mock-translations';
import testRender from '@/utils/test/test-render';
import { trialsQuotasKeys } from '@graphql/deployment/deployment.keys';
import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { useTranslations } from 'next-intl';
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  showSnackbar: vi.fn(),
  useTrialsUpdateDeploymentQuotaCapacityMutation: vi.fn(),
}));

vi.mock('@/components/ui/snackbar/snackbar-store', () => ({
  showSnackbar: mocks.showSnackbar,
}));

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useTrialsUpdateDeploymentQuotaCapacityMutation:
    mocks.useTrialsUpdateDeploymentQuotaCapacityMutation,
}));

const updateQuota = vi.fn();

const renderForm = () =>
  testRender(
    <SheetWithPreventingDialog
      open
      setOpen={vi.fn()}
      title={SHEET_TITLE}>
      <TrialsTabQuotasPlatformUpdateForm
        quota={QUOTA}
        callback={vi.fn()}
      />
    </SheetWithPreventingDialog>
  );

describe('TrialsTabQuotasPlatformUpdateForm', () => {
  beforeEach(() => {
    mockQuotaUpdate(mocks.useTrialsUpdateDeploymentQuotaCapacityMutation, {
      recordVariables: updateQuota,
    });
  });

  it.each([
    { context: 'raised', capacity: NEW_CAPACITY },
    { context: 'set to zero', capacity: 0 },
  ])(
    'should send the region and the new capacity when the admin confirms a capacity $context',
    async ({ capacity }) => {
      // Given
      const { user } = renderForm();

      // When
      await confirmCapacity(user, capacity);

      // Then
      expect(updateQuota).toHaveBeenCalledWith({
        input: { region: QUOTA_REGION, newCapacity: capacity },
      });
    }
  );

  it('should refresh the quotas when the capacity is updated', async () => {
    // Given
    const invalidateQueries = vi.spyOn(
      QueryClient.prototype,
      'invalidateQueries'
    );
    onTestFinished(() => invalidateQueries.mockRestore());
    const { user } = renderForm();

    // When
    await confirmCapacity(user, NEW_CAPACITY);

    // Then
    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: trialsQuotasKeys.all(),
      });
    });
  });

  it('should confirm the update in a toast when the capacity is updated', async () => {
    // Given
    const { user } = renderForm();

    // When
    await confirmCapacity(user, NEW_CAPACITY);

    // Then
    await waitFor(() => {
      expect(mocks.showSnackbar).toHaveBeenCalledWith({
        severity: 'success',
        title: 'Utils.Success',
        description: 'TrialsDashboard.UpdateQuotasForm.QuotasUpdated',
      });
    });
  });

  it.each([
    {
      context: 'the server rejects it',
      error: new Error(SERVER_ERROR),
      expected: `Error.Server.${SERVER_ERROR}`,
    },
    {
      context: 'it fails without an error message',
      error: SERVER_ERROR,
      expected: 'Error.Server.UnknownError',
    },
  ])(
    'should show the error in a toast when the update fails because $context',
    async ({ error, expected }) => {
      // Given
      mockQuotaUpdate(mocks.useTrialsUpdateDeploymentQuotaCapacityMutation, {
        error,
      });
      const { user } = renderForm();

      // When
      await confirmCapacity(user, NEW_CAPACITY);

      // Then
      await waitFor(() => {
        expect(mocks.showSnackbar).toHaveBeenCalledWith({
          severity: 'error',
          title: 'Utils.Error',
          description: expected,
        });
      });
    }
  );

  it.each([
    {
      context: 'cleared',
      fill: (user: UserEvent) => user.clear(getCapacityInput()),
    },
    {
      context: 'negative',
      fill: (user: UserEvent) => typeCapacity(user, '-1'),
    },
  ])(
    'should prevent the submission when the capacity is $context',
    async ({ fill }) => {
      // Given
      const { user } = renderForm();

      // When
      await fill(user);

      // Then
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: VALIDATE_LABEL })
        ).toBeDisabled();
      });
    }
  );

  it('should show the region, the current and the new capacity when the admin is asked to confirm', async () => {
    // Given
    vi.mocked(useTranslations).mockReturnValue(
      mockTranslations({ translate: translateWithValues })
    );
    const { user } = renderForm();

    // When
    const confirmDialog = await submitCapacity(user, NEW_CAPACITY);

    // Then
    expect(confirmDialog).toHaveTextContent(
      translateWithValues(
        'TrialsDashboard.UpdateQuotasForm.AlertDialog.ConfirmDescription',
        {
          region: QUOTA_REGION_LABEL,
          oldCapacity: CURRENT_CAPACITY,
          newCapacity: NEW_CAPACITY,
        }
      )
    );
  });

  it('should ask before leaving when the admin cancels after changing the capacity', async () => {
    // Given
    const { user } = renderForm();
    await typeCapacity(user, String(NEW_CAPACITY));

    // When
    await user.click(screen.getByRole('button', { name: CANCEL_LABEL }));

    // Then
    expect(
      await screen.findByRole('alertdialog', {
        name: 'DialogActions.PreventSheetTitle',
      })
    ).toBeInTheDocument();
  });
});
