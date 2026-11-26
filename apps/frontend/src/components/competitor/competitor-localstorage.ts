import { isValueInEnum } from '@/utils/is-value-in-enum';
import { CompetitorOrdering, OrderingMode } from '@graphql/generated';
import { useEffect } from 'react';
import { useLocalStorage } from 'usehooks-ts';

export const useCompetitorListLocalstorage = () => {
  const [orderMode, setOrderMode, removeOrderMode] =
    useLocalStorage<OrderingMode>('orderModeCompetitorList', OrderingMode.Asc);
  const [orderBy, setOrderBy, removeOrderBy] =
    useLocalStorage<CompetitorOrdering>(
      'orderByCompetitorList',
      CompetitorOrdering.Tier
    );

  useEffect(() => {
    if (!isValueInEnum(orderBy, CompetitorOrdering)) {
      setOrderBy(CompetitorOrdering.Tier);
    }
  }, [orderBy, setOrderBy]);

  const [pageSize, setPageSize, removePageSize] = useLocalStorage(
    'countCompetitorList',
    50
  );

  const resetAll = () => {
    removeOrderMode();
    removeOrderBy();
    removePageSize();
  };

  const removeOrder = () => {
    removeOrderBy();
    removeOrderMode();
  };

  return {
    orderMode,
    setOrderMode,
    orderBy,
    setOrderBy,
    pageSize,
    setPageSize,
    resetAll,
    removeOrder,
  };
};
