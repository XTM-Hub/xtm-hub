import { OrderingMode, RegisteredPlatformOrdering } from '@graphql/generated';
import { useEffect } from 'react';
import { useLocalStorage } from 'usehooks-ts';

import { isValueInEnum } from '@/utils/is-value-in-enum';

export const useSaasListLocalstorage = () => {
  const [orderMode, setOrderMode, removeOrderMode] =
    useLocalStorage<OrderingMode>('orderModeSaasList', OrderingMode.Asc);
  const [orderBy, setOrderBy, removeOrderBy] =
    useLocalStorage<RegisteredPlatformOrdering>(
      'orderBySaasList',
      RegisteredPlatformOrdering.PlatformTitle
    );
  const [pageSize, setPageSize, removePageSize] = useLocalStorage(
    'countSaasList',
    50
  );

  useEffect(() => {
    if (!isValueInEnum(orderBy, RegisteredPlatformOrdering)) {
      setOrderBy(RegisteredPlatformOrdering.PlatformTitle);
    }
  }, [orderBy, setOrderBy]);

  const resetAll = () => {
    removeOrderBy();
    removeOrderMode();
    removePageSize();
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
    resetAll,
    removeOrder,
  };
};
