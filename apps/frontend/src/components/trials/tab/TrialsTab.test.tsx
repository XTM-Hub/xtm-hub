import TrialsTab from '@/components/trials/tab/TrialsTab';
import {
  BUNDLE_SCOPE,
  TrialsScope,
  TrialsTabType,
  productScope,
} from '@/components/trials/trials.const';
import testRender from '@/utils/test/test-render';
import { PlatformIdentifier } from '@graphql/generated';
import { ColumnDef } from '@tanstack/react-table';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const renderedColumns: string[] = [];

vi.mock('@filigran/ui', () => ({
  DataTable: ({ columns }: { columns: ColumnDef<unknown>[] }) => {
    renderedColumns.splice(
      0,
      renderedColumns.length,
      ...columns.map((column) => column.id ?? '')
    );
    return <div>DataTable</div>;
  },
  DataTableHeadBarOptions: () => <div>HeadBarOptions</div>,
}));
const cancelSpy = vi.fn();
const reorderSpy = vi.fn();
vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useTrialsListQuery: () => ({ data: undefined }),
  useTrialsAdminCancelDeploymentRequestMutation: () => ({ mutate: cancelSpy }),
  useTrialsReorderDeploymentRequestInQueueMutation: () => ({
    mutate: reorderSpy,
  }),
}));
vi.mock('@graphql/deployment/deployment.keys', () => ({
  trialsKeys: {
    all: () => ['TrialsList'],
    list: () => ['TrialsList', {}],
  },
}));

const columnsOf = (type: TrialsTabType, scope: TrialsScope = BUNDLE_SCOPE) => {
  testRender(
    <TrialsTab
      type={type}
      scope={scope}
    />
  );
  return renderedColumns;
};

const OPENCTI_SCOPE = productScope(PlatformIdentifier.Opencti);

describe('TrialsTab', () => {
  beforeEach(() => {
    renderedColumns.splice(0, renderedColumns.length);
  });

  it('should call mutation and show toast on reorder', () => {
    columnsOf(TrialsTabType.Waiting, OPENCTI_SCOPE);

    reorderSpy();

    expect(reorderSpy).toHaveBeenCalled();
  });

  it('should call mutation and show toast on cancel', () => {
    columnsOf(TrialsTabType.Running, OPENCTI_SCOPE);

    cancelSpy();

    expect(cancelSpy).toHaveBeenCalled();
  });

  it('should never display a bundle status column', () => {
    Object.values(TrialsTabType).forEach((type) => {
      expect(columnsOf(type)).not.toContain('hub_status');
    });
  });

  it('should display the status of a product trial', () => {
    Object.values(TrialsTabType).forEach((type) => {
      expect(columnsOf(type, OPENCTI_SCOPE)).toContain('hub_status');
    });
  });

  it('should only prioritize bundles on the waiting tab', () => {
    // Then
    expect(columnsOf(TrialsTabType.Waiting)).toContain('ordering');
    expect(columnsOf(TrialsTabType.Running)).not.toContain('ordering');
  });

  it('should display the request date while waiting, and the trial dates once running', () => {
    // Then
    expect(columnsOf(TrialsTabType.Waiting)).toContain('request_date');
    expect(columnsOf(TrialsTabType.Waiting)).not.toContain('end_date');
    expect(columnsOf(TrialsTabType.Running)).toEqual(
      expect.arrayContaining(['start_date', 'end_date', 'remainingDays'])
    );
  });

  it('should only detail the cancellation on the cancelled tab', () => {
    // Then
    expect(columnsOf(TrialsTabType.Cancelled)).toEqual(
      expect.arrayContaining([
        'cancellation_date',
        'cancellation_user_email',
        'cancellation_reason',
      ])
    );
    expect(columnsOf(TrialsTabType.Expired)).not.toContain('cancellation_date');
  });

  it('should always display the products of the bundle', () => {
    Object.values(TrialsTabType).forEach((type) => {
      expect(columnsOf(type)).toContain('products');
    });
  });

  it('should never display a products column on a product trial', () => {
    Object.values(TrialsTabType).forEach((type) => {
      expect(columnsOf(type, OPENCTI_SCOPE)).not.toContain('products');
    });
  });
});
