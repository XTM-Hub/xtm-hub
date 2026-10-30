import { USER_LIST_ORGANIZATION_FILTER_KEY } from '@/utils/filters-storage.utils';
import { isValueInEnum } from '@/utils/is-value-in-enum';
import { OrderingMode } from '@generated/UserListQuery.graphql';
import { UserOrdering } from '@graphql/generated';
import { useLocalStorage, useSessionStorage } from 'usehooks-ts';

export const useUserListLocalstorage = () => {
  const [count, setCount, removeCount] = useLocalStorage('countUserList', 50);
  const [orderMode, setOrderMode, removeOrderMode] =
    useLocalStorage<OrderingMode>('orderModeUserList', 'asc');
  const [orderBy, setOrderBy, removeOrderBy] = useLocalStorage<UserOrdering>(
    'orderByUserList',
    UserOrdering.Email
  );

  if (!isValueInEnum(orderBy, UserOrdering)) {
    setOrderBy(UserOrdering.Email);
  }
  const [pageSize, setPageSize, removePageSize] = useLocalStorage(
    'countUserList',
    50
  );
  const [columnOrder, setColumnOrder, removeColumnOrder] = useLocalStorage<
    string[]
  >('columnOrderingUserList', []);

  const [columnVisibility, setColumnVisibility, removeColumnVisibility] =
    useLocalStorage('columnVisibilityUserList', {});

  const [organizationFilter, setOrganizationFilter, removeOrganizationFilter] =
    useSessionStorage<string | undefined>(
      USER_LIST_ORGANIZATION_FILTER_KEY,
      undefined
    );

  const resetAll = () => {
    removeCount();
    removeOrderMode();
    removeOrderBy();
    removePageSize();
    removeColumnOrder();
    removeColumnVisibility();
    removeOrganizationFilter();
  };

  const removeOrder = () => {
    removeOrderBy();
    removeOrderMode();
  };

  return {
    count,
    setCount,
    orderMode,
    setOrderMode,
    orderBy,
    setOrderBy,
    removeOrderBy,
    pageSize,
    setPageSize,
    columnOrder,
    setColumnOrder,
    columnVisibility,
    setColumnVisibility,
    organizationFilter,
    setOrganizationFilter,
    resetAll,
    removeOrder,
  };
};
