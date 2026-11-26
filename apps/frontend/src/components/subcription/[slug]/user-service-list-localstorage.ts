import { OrderingMode, UserServiceOrdering } from '@graphql/generated';
import { useEffect } from 'react';
import { useLocalStorage } from 'usehooks-ts';

import { isValueInEnum } from '@/utils/is-value-in-enum';

const DEFAULT_PAGE_SIZE = 50;

export const useUserServiceListLocalstorage = () => {
  const [storedOrderMode, setOrderMode] = useLocalStorage<OrderingMode>(
    'orderModeUserServices',
    OrderingMode.Asc
  );
  const [storedOrderBy, setOrderBy] = useLocalStorage<UserServiceOrdering>(
    'orderByUserServices',
    UserServiceOrdering.FirstName
  );
  const [pageSize, setPageSize] = useLocalStorage(
    'countUserServices',
    DEFAULT_PAGE_SIZE
  );

  // A stored ordering the API no longer accepts is replaced before any query is built with it.
  const orderMode = isValueInEnum(storedOrderMode, OrderingMode)
    ? storedOrderMode
    : OrderingMode.Asc;
  const orderBy = isValueInEnum(storedOrderBy, UserServiceOrdering)
    ? storedOrderBy
    : UserServiceOrdering.FirstName;

  useEffect(() => {
    if (orderMode !== storedOrderMode) {
      setOrderMode(orderMode);
    }
  }, [orderMode, storedOrderMode, setOrderMode]);

  useEffect(() => {
    if (orderBy !== storedOrderBy) {
      setOrderBy(orderBy);
    }
  }, [orderBy, storedOrderBy, setOrderBy]);

  return { orderBy, orderMode, pageSize, setPageSize };
};
