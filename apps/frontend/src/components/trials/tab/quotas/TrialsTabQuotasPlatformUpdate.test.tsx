import { TrialsTabQuotasPlatformUpdate } from '@/components/trials/tab/quotas/TrialsTabQuotasPlatformUpdate';
import {
  confirmCapacity,
  mockQuotaUpdate,
  NEW_CAPACITY,
  QUOTA,
  QUOTA_REGION_LABEL,
  SERVER_ERROR,
  SHEET_TITLE,
} from '@/components/trials/tab/quotas/TrialsTabQuotasPlatformUpdateForm.test-utils';
import {
  mockTranslations,
  translateWithValues,
} from '@/utils/test/mock-translations';
import testRender from '@/utils/test/test-render';
import { screen, waitFor } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

const renderSheet = () => {
  const onCloseSheet = vi.fn();
  const { user } = testRender(
    <TrialsTabQuotasPlatformUpdate
      quota={QUOTA}
      defaultStateOpen
      onCloseSheet={onCloseSheet}
    />
  );
  return { onCloseSheet, user };
};

describe('TrialsTabQuotasPlatformUpdate', () => {
  beforeEach(() => {
    mockQuotaUpdate(mocks.useTrialsUpdateDeploymentQuotaCapacityMutation);
  });

  it('should title the sheet with the region of the quota when it opens', async () => {
    // Given
    vi.mocked(useTranslations).mockReturnValue(
      mockTranslations({ translate: translateWithValues })
    );

    // When
    renderSheet();

    // Then
    expect(
      await screen.findByRole('dialog', {
        name: translateWithValues(SHEET_TITLE, { region: QUOTA_REGION_LABEL }),
      })
    ).toBeInTheDocument();
  });

  it('should tell the parent the sheet is closed when the capacity is updated', async () => {
    // Given
    const { onCloseSheet, user } = renderSheet();

    // When
    await confirmCapacity(user, NEW_CAPACITY);

    // Then
    await waitFor(() => {
      expect(onCloseSheet).toHaveBeenCalledTimes(1);
    });
  });

  it('should keep the sheet open when the update fails', async () => {
    // Given
    mockQuotaUpdate(mocks.useTrialsUpdateDeploymentQuotaCapacityMutation, {
      error: new Error(SERVER_ERROR),
    });
    const { user } = renderSheet();

    // When
    await confirmCapacity(user, NEW_CAPACITY);

    // Then
    await waitFor(() => {
      expect(mocks.showSnackbar).toHaveBeenCalled();
    });
    expect(
      screen.getByRole('dialog', { name: SHEET_TITLE })
    ).toBeInTheDocument();
  });
});
