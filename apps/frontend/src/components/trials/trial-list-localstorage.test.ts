import { TrialsTabType } from '@/components/trials/trials.const';
import { DeploymentRequestOrdering, OrderingMode } from '@graphql/generated';
import { ColumnDef } from '@tanstack/react-table';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useTrialsListLocalstorage } from './trial-list-localstorage';

const COLUMNS: ColumnDef<unknown>[] = [
  { id: 'organization' },
  { display: 'custom' } as unknown as ColumnDef<unknown>,
  { id: 'request_date' },
  { id: 'registration_status' },
];
const COLUMN_IDS = ['organization', 'request_date', 'registration_status'];
const DEFAULT_COLUMN_VISIBILITY = {
  registration_status: false,
  platform_url: false,
  platform_id: false,
};
const DEFAULT_ORDER = DeploymentRequestOrdering.RequestDate;
const DEFAULT_ORDER_MODE = OrderingMode.Desc;
const DEFAULT_PAGE_SIZE = 50;
const CUSTOM_PAGE_SIZE = 100;
const BUNDLE_RUNNING_SUFFIX = 'bundle_running';
const ORDER_MODE_KEY = `orderModeTrialsList_${BUNDLE_RUNNING_SUFFIX}`;
const ORDER_BY_KEY = `orderByTrialsList_${BUNDLE_RUNNING_SUFFIX}`;
const PAGE_SIZE_KEY = `countTrialsList_${BUNDLE_RUNNING_SUFFIX}`;
const COLUMN_ORDER_KEY = `columnOrderingTrialsList_${BUNDLE_RUNNING_SUFFIX}`;
const COLUMN_VISIBILITY_KEY = `columnVisibilityTrialsList_${BUNDLE_RUNNING_SUFFIX}`;

const readStored = (key: string) =>
  JSON.parse(window.localStorage.getItem(key) ?? 'null');

const renderTrialsHook = (type: TrialsTabType = TrialsTabType.Running) =>
  renderHook(() =>
    useTrialsListLocalstorage(COLUMNS, type, DEFAULT_ORDER, DEFAULT_ORDER_MODE)
  );

describe('useTrialsListLocalstorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('should expose the defaults given by the caller and only order the columns that have an id when nothing is stored', () => {
    // Given / When
    const { result } = renderTrialsHook();

    // Then
    expect(result.current).toMatchObject({
      orderBy: DEFAULT_ORDER,
      orderMode: DEFAULT_ORDER_MODE,
      pageSize: DEFAULT_PAGE_SIZE,
      columnOrder: COLUMN_IDS,
      columnVisibility: DEFAULT_COLUMN_VISIBILITY,
    });
  });

  it('should restore the preferences stored for the same tab', () => {
    // Given
    window.localStorage.setItem(
      ORDER_BY_KEY,
      JSON.stringify(DeploymentRequestOrdering.EndDate)
    );
    window.localStorage.setItem(
      PAGE_SIZE_KEY,
      JSON.stringify(CUSTOM_PAGE_SIZE)
    );

    // When
    const { result } = renderTrialsHook(TrialsTabType.Running);

    // Then
    expect(result.current).toMatchObject({
      orderBy: DeploymentRequestOrdering.EndDate,
      pageSize: CUSTOM_PAGE_SIZE,
    });
  });

  it.each([
    TrialsTabType.Cancelled,
    TrialsTabType.Expired,
    TrialsTabType.Waiting,
  ])('should ignore the preferences stored for the %s tab', (type) => {
    // Given
    window.localStorage.setItem(
      PAGE_SIZE_KEY,
      JSON.stringify(CUSTOM_PAGE_SIZE)
    );

    // When
    const { result } = renderTrialsHook(type);

    // Then
    expect(result.current.pageSize).toBe(DEFAULT_PAGE_SIZE);
  });

  it('should drop the stored ordering but keep the stored page size when removeOrder is called', () => {
    // Given
    const { result } = renderTrialsHook();
    act(() => {
      result.current.setOrderMode(OrderingMode.Asc);
      result.current.setOrderBy(DeploymentRequestOrdering.Region);
      result.current.setPageSize(CUSTOM_PAGE_SIZE);
    });

    // When
    act(() => {
      result.current.removeOrder();
    });

    // Then
    expect(result.current).toMatchObject({
      orderMode: DEFAULT_ORDER_MODE,
      orderBy: DEFAULT_ORDER,
      pageSize: CUSTOM_PAGE_SIZE,
    });
    expect(readStored(ORDER_MODE_KEY)).toBeNull();
    expect(readStored(ORDER_BY_KEY)).toBeNull();
    expect(readStored(PAGE_SIZE_KEY)).toBe(CUSTOM_PAGE_SIZE);
  });

  it('should drop every stored preference when resetAll is called', () => {
    // Given
    const { result } = renderTrialsHook();
    act(() => {
      result.current.setOrderMode(OrderingMode.Asc);
      result.current.setOrderBy(DeploymentRequestOrdering.Region);
      result.current.setPageSize(CUSTOM_PAGE_SIZE);
      result.current.setColumnOrder(['request_date']);
      result.current.setColumnVisibility({ organization: false });
    });

    // When
    act(() => {
      result.current.resetAll();
    });

    // Then
    expect(result.current).toMatchObject({
      orderMode: DEFAULT_ORDER_MODE,
      orderBy: DEFAULT_ORDER,
      pageSize: DEFAULT_PAGE_SIZE,
      columnOrder: COLUMN_IDS,
      columnVisibility: DEFAULT_COLUMN_VISIBILITY,
    });
    expect(readStored(ORDER_MODE_KEY)).toBeNull();
    expect(readStored(ORDER_BY_KEY)).toBeNull();
    expect(readStored(PAGE_SIZE_KEY)).toBeNull();
    expect(readStored(COLUMN_ORDER_KEY)).toBeNull();
    expect(readStored(COLUMN_VISIBILITY_KEY)).toBeNull();
  });
});
