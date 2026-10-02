import { TrialsTabQuotasPlatform } from '@/components/trials/tab/quotas/TrialsTabQuotasPlatform';
import testRender from '@/utils/test/test-render';
import {
  DeploymentRequestPlatformRegion,
  PortalCapability,
  TrialsQuotaFragment,
} from '@graphql/generated';
import { ColumnDef, Row } from '@tanstack/react-table';
import { act, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let renderedColumns: ColumnDef<TrialsQuotaFragment>[] = [];
let renderedData: TrialsQuotaFragment[] = [];
let clickRow: (row: Row<TrialsQuotaFragment>) => void = () => undefined;

vi.mock('@filigran/ui', () => ({
  DataTable: ({
    columns,
    data,
    onClickRow,
  }: {
    columns: ColumnDef<TrialsQuotaFragment>[];
    data: TrialsQuotaFragment[];
    onClickRow: (row: Row<TrialsQuotaFragment>) => void;
  }) => {
    renderedColumns = columns;
    renderedData = data;
    clickRow = onClickRow;
    return <div>DataTable</div>;
  },
}));
vi.mock('@/components/trials/tab/quotas/TrialsTabQuotasPlatformUpdate', () => ({
  TrialsTabQuotasPlatformUpdate: ({
    quota,
  }: {
    quota: TrialsQuotaFragment;
  }) => <div>{`capacity sheet of ${quota.id}`}</div>,
}));

const availableQuotas = vi.fn<() => TrialsQuotaFragment[]>(() => []);
vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useTrialsQuotasQuery: () => ({
    data: { deploymentRequestsAvailable: availableQuotas() },
  }),
}));
vi.mock('@graphql/deployment/deployment.keys', () => ({
  trialsQuotasKeys: {
    all: () => ['TrialsQuotas'],
    list: () => ['TrialsQuotas', {}],
  },
}));

const makeQuota = (
  region: DeploymentRequestPlatformRegion,
  capacity = 10,
  availableCount = 4
): TrialsQuotaFragment => ({
  id: `quota-${region}`,
  region,
  capacity,
  availableCount,
});

const renderQuotas = () =>
  testRender(<TrialsTabQuotasPlatform />, {
    me: {
      capabilities: [{ name: PortalCapability.ModifyTrialsQuota } as never],
    },
  });

describe('TrialsTabQuotasPlatform', () => {
  beforeEach(() => {
    availableQuotas.mockReturnValue([]);
    renderedColumns = [];
    renderedData = [];
  });

  it('should detail the availability of every region', () => {
    // When
    renderQuotas();

    // Then
    expect(renderedColumns.map((column) => column.id)).toEqual([
      'region',
      'available',
      'taken',
      'total',
    ]);
  });

  it('should take a place out of the capacity for every place no longer available', () => {
    // Given
    const quota = makeQuota(DeploymentRequestPlatformRegion.EuWest, 10, 4);
    availableQuotas.mockReturnValue([quota]);

    // When
    renderQuotas();
    const takenColumn = renderedColumns.find(
      (column) => column.id === 'taken'
    ) as { accessorFn: (quota: TrialsQuotaFragment) => number };

    // Then
    expect(takenColumn.accessorFn(quota)).toBe(6);
  });

  it('should order the regions by their name', () => {
    // Given
    availableQuotas.mockReturnValue([
      makeQuota(DeploymentRequestPlatformRegion.UsEast),
      makeQuota(DeploymentRequestPlatformRegion.ApacSg),
    ]);

    // When
    renderQuotas();

    // Then
    expect(renderedData.map(({ region }) => region)).toEqual([
      DeploymentRequestPlatformRegion.ApacSg,
      DeploymentRequestPlatformRegion.UsEast,
    ]);
  });

  it('should open the capacity sheet on the clicked quota', () => {
    // Given
    const quota = makeQuota(DeploymentRequestPlatformRegion.EuWest);
    availableQuotas.mockReturnValue([quota]);
    renderQuotas();

    // When
    act(() => clickRow({ original: quota } as Row<TrialsQuotaFragment>));

    // Then
    expect(
      screen.getByText(`capacity sheet of ${quota.id}`)
    ).toBeInTheDocument();
  });
});
