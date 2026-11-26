import { OrderingMode, SaasPlatformOrdering } from '@graphql/generated';
import {
  ColumnDef,
  ColumnSizingState,
  VisibilityState,
} from '@tanstack/react-table';
import { useEffect } from 'react';
import { useLocalStorage } from 'usehooks-ts';

import { isValueInEnum } from '@/utils/is-value-in-enum';

export const useSaasListLocalstorage = <TData>(columns: ColumnDef<TData>[]) => {
  const [orderMode, setOrderMode, removeOrderMode] =
    useLocalStorage<OrderingMode>('orderModeSaasList', OrderingMode.Asc);
  const [storedOrderBy, setOrderBy, removeOrderBy] =
    useLocalStorage<SaasPlatformOrdering>(
      'orderBySaasList',
      SaasPlatformOrdering.CustomerName
    );
  const [pageSize, setPageSize, removePageSize] = useLocalStorage(
    'countSaasList',
    50
  );
  const [columnOrder, setColumnOrder, removeColumnOrder] = useLocalStorage(
    'columnOrderingSaasList',
    columns.flatMap((column) => (column.id ? [column.id] : []))
  );
  const [columnVisibility, setColumnVisibility, removeColumnVisibility] =
    useLocalStorage<VisibilityState>('columnVisibilitySaasList', {});
  const [columnSizing, setColumnSizing, removeColumnSizing] =
    useLocalStorage<ColumnSizingState>('columnSizingSaasList', {});

  // A field an older list ordered by is no ordering anymore: it is replaced before any query is built with it.
  const orderBy = isValueInEnum(storedOrderBy, SaasPlatformOrdering)
    ? storedOrderBy
    : SaasPlatformOrdering.CustomerName;

  useEffect(() => {
    if (orderBy !== storedOrderBy) {
      setOrderBy(orderBy);
    }
  }, [orderBy, storedOrderBy, setOrderBy]);

  const resetAll = () => {
    removeOrderBy();
    removeOrderMode();
    removePageSize();
    removeColumnOrder();
    removeColumnVisibility();
    removeColumnSizing();
  };

  const removeOrder = () => {
    removeOrderBy();
    removeOrderMode();
  };

  return {
    orderBy,
    setOrderBy,
    orderMode,
    setOrderMode,
    pageSize,
    setPageSize,
    columnOrder,
    setColumnOrder,
    columnVisibility,
    setColumnVisibility,
    columnSizing,
    setColumnSizing,
    resetAll,
    removeOrder,
  };
};
