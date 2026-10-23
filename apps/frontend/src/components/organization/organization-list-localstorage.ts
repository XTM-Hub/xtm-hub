import { isValueInEnum } from '@/utils/is-value-in-enum';
import { OrderingMode, OrganizationOrdering } from '@graphql/generated';
import { ColumnDef } from '@tanstack/react-table';
import { useEffect } from 'react';
import { useLocalStorage } from 'usehooks-ts';

export const useOrganizationListLocalstorage = <U>(columns: ColumnDef<U>[]) => {
  const [orderMode, setOrderMode, removeOrderMode] =
    useLocalStorage<OrderingMode>(
      'orderModeOrganizationList',
      OrderingMode.Asc
    );
  const [orderBy, setOrderBy, removeOrderBy] =
    useLocalStorage<OrganizationOrdering>(
      'orderByOrganizationList',
      OrganizationOrdering.Name
    );
  const safeOrderBy = isValueInEnum(orderBy, OrganizationOrdering)
    ? orderBy
    : OrganizationOrdering.Name;
  useEffect(() => {
    if (!isValueInEnum(orderBy, OrganizationOrdering)) {
      setOrderBy(OrganizationOrdering.Name);
    }
  }, [orderBy, setOrderBy]);
  const [pageSize, setPageSize, removePageSize] = useLocalStorage(
    'countOrganizationList',
    50
  );

  const [columnOrder, setColumnOrder, removeColumnOrder] = useLocalStorage(
    'columnOrderingOrganizationList',
    columns.flatMap((column) => (column.id ? [column.id] : []))
  );

  const [columnVisibility, setColumnVisibility, removeColumnVisibility] =
    useLocalStorage('columnVisibilityOrganizationList', {});

  const resetAll = () => {
    removeOrderMode();
    removeOrderBy();
    removePageSize();
    removeColumnOrder();
    removeColumnVisibility();
  };

  const removeOrder = () => {
    removeOrderBy();
    removeOrderMode();
  };

  return {
    orderMode,
    setOrderMode,
    orderBy: safeOrderBy,
    setOrderBy,
    removeOrder,
    pageSize,
    setPageSize,
    columnOrder,
    setColumnOrder,
    columnVisibility,
    setColumnVisibility,
    resetAll,
  };
};
