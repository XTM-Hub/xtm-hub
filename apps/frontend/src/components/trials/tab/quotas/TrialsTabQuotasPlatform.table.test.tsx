import { TrialsTabQuotasPlatform } from '@/components/trials/tab/quotas/TrialsTabQuotasPlatform';
import {
  CANCEL_LABEL,
  SHEET_TITLE,
} from '@/components/trials/tab/quotas/TrialsTabQuotasPlatformUpdateForm.test-utils';
import testRender from '@/utils/test/test-render';
import {
  DeploymentRequestPlatformRegion,
  PortalCapability,
} from '@graphql/generated';
import { mockDeploymentAvailability } from '@graphql/mocks';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const REGION_LABEL = 'Region.US_EAST';

const mocks = vi.hoisted(() => ({
  useTrialsQuotasQuery: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useTrialsQuotasQuery: mocks.useTrialsQuotasQuery,
  });
});

const renderQuotas = (capabilities: PortalCapability[]) =>
  testRender(<TrialsTabQuotasPlatform />, {
    me: { capabilities: capabilities.map((name) => ({ name })) },
  });

describe('TrialsTabQuotasPlatform', () => {
  beforeEach(() => {
    mocks.useTrialsQuotasQuery.mockReturnValue({
      data: {
        deploymentRequestsAvailable: [
          mockDeploymentAvailability({
            region: DeploymentRequestPlatformRegion.UsEast,
            capacity: 10,
            availableCount: 4,
          }),
        ],
      },
    });
  });

  it('should label each quota row with its region when the quotas are listed', () => {
    // Given / When
    renderQuotas([PortalCapability.ReadTrials]);

    // Then
    expect(
      screen.getByRole('cell', { name: REGION_LABEL })
    ).toBeInTheDocument();
  });

  it('should not open the capacity sheet when an admin who cannot modify the quotas clicks a region', async () => {
    // Given
    const { user } = renderQuotas([PortalCapability.ReadTrials]);

    // When
    await user.click(screen.getByRole('cell', { name: REGION_LABEL }));

    // Then
    expect(
      screen.queryByRole('dialog', { name: SHEET_TITLE })
    ).not.toBeInTheDocument();
  });

  it('should reopen the capacity sheet when the admin clicks the same region after closing it', async () => {
    // Given
    const { user } = renderQuotas([PortalCapability.ModifyTrialsQuota]);
    await user.click(screen.getByRole('cell', { name: REGION_LABEL }));
    await user.click(screen.getByRole('button', { name: CANCEL_LABEL }));

    // When
    await user.click(screen.getByRole('cell', { name: REGION_LABEL }));

    // Then
    expect(
      await screen.findByRole('dialog', { name: SHEET_TITLE })
    ).toBeInTheDocument();
  });
});
