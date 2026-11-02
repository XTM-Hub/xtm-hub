import { buildTrialsFilters } from '@/components/trials/tab/trials-tab.utils';
import { TrialsTabType } from '@/components/trials/trials.const';
import TrialsList from '@/components/trials/TrialsList';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useTrialsListQuery: vi.fn(),
  useTrialsQuotasQuery: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useTrialsListQuery: mocks.useTrialsListQuery,
    useTrialsQuotasQuery: mocks.useTrialsQuotasQuery,
  });
});

const expectTrialsRequestedFor = (type: TrialsTabType) =>
  expect(mocks.useTrialsListQuery).toHaveBeenLastCalledWith(
    expect.anything(),
    expect.objectContaining({ filters: buildTrialsFilters(type) }),
    expect.anything()
  );

describe('TrialsList', () => {
  beforeEach(() => {
    mocks.useTrialsListQuery.mockReturnValue({ data: undefined });
    mocks.useTrialsQuotasQuery.mockReturnValue({ data: undefined });
  });

  it('should request the waiting trials when the admin opens the dashboard', () => {
    // Given / When
    testRender(<TrialsList />);

    // Then
    expectTrialsRequestedFor(TrialsTabType.Waiting);
  });

  it.each([
    {
      type: TrialsTabType.Cancelled,
      title: 'TrialsDashboard.TabTitle.Cancelled',
    },
    { type: TrialsTabType.Expired, title: 'TrialsDashboard.TabTitle.Expired' },
    { type: TrialsTabType.Running, title: 'TrialsDashboard.TabTitle.Running' },
  ])(
    'should request the $type trials when the admin selects their tab',
    async ({ type, title }) => {
      // Given
      const { user } = testRender(<TrialsList />);

      // When
      await user.click(screen.getByRole('tab', { name: title }));

      // Then
      expectTrialsRequestedFor(type);
    }
  );

  it('should show the quotas when the admin selects their tab', async () => {
    // Given
    const { user } = testRender(<TrialsList />);

    // When
    await user.click(
      screen.getByRole('tab', { name: 'TrialsDashboard.TabTitle.Quotas' })
    );

    // Then
    expect(
      screen.getByText('TrialsDashboard.Columns.Available')
    ).toBeInTheDocument();
  });
});
