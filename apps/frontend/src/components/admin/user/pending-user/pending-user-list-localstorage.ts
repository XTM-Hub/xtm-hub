import { isValueInEnum } from '@/utils/is-value-in-enum';
import { OrderingMode, UserOrdering } from '@graphql/generated';
import { useLocalStorage } from 'usehooks-ts';

export const useUserListLocalstorage = () => {
  const [count, setCount, removeCount] = useLocalStorage(
    'countPendingUserList',
    50
  );
  const [orderMode, setOrderMode, removeOrderMode] =
    useLocalStorage<OrderingMode>('orderModePendingUserList', OrderingMode.Asc);
  const [orderBy, setOrderBy, removeOrderBy] = useLocalStorage<UserOrdering>(
    'orderByPendingUserList',
    UserOrdering.Email
  );

  if (!isValueInEnum(orderBy, UserOrdering)) {
    setOrderBy(UserOrdering.Email);
  }
  const [pageSize, setPageSize, removePageSize] = useLocalStorage(
    'countPendingUserList',
    50
  );
  const [columnOrder, setColumnOrder, removeColumnOrder] = useLocalStorage<
    string[]
  >('columnOrderingPendingUserList', []);

  const [columnVisibility, setColumnVisibility, removeColumnVisibility] =
    useLocalStorage('columnVisibilityPendingUserList', {});

  const resetAll = () => {
    removeCount();
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
    resetAll,
    removeOrder,
  };
};
