import {
  ADMIN_REGISTERED_PLATFORMS_DEFAULT_ORDER_BY,
  ADMIN_REGISTERED_PLATFORMS_DEFAULT_ORDER_MODE,
  ADMIN_REGISTERED_PLATFORMS_DEFAULT_PAGE_SIZE,
  normalizeAdminRegisteredPlatformsPageSize,
} from '@/components/admin/registered-platform/admin-registered-platforms.utils';
import { isValueInEnum } from '@/utils/is-value-in-enum';
import {
  AdminRegisteredPlatformOrdering,
  OrderingMode,
} from '@graphql/generated';
import { useEffect } from 'react';
import { useLocalStorage } from 'usehooks-ts';

export const useAdminRegisteredPlatformsLocalstorage = () => {
  const [storedOrderMode, setOrderMode, removeOrderMode] =
    useLocalStorage<OrderingMode>(
      'orderModeAdminRegisteredPlatformsList',
      ADMIN_REGISTERED_PLATFORMS_DEFAULT_ORDER_MODE
    );
  const [storedOrderBy, setOrderBy, removeOrderBy] =
    useLocalStorage<AdminRegisteredPlatformOrdering>(
      'orderByAdminRegisteredPlatformsList',
      ADMIN_REGISTERED_PLATFORMS_DEFAULT_ORDER_BY
    );
  const [storedPageSize, setPageSize, removePageSize] = useLocalStorage(
    'countAdminRegisteredPlatformsList',
    ADMIN_REGISTERED_PLATFORMS_DEFAULT_PAGE_SIZE
  );

  // A stored value the list no longer accepts is replaced before any query is built with it: the page size drives the
  // cursor, so it must already be within the API cap.
  const orderBy = isValueInEnum(storedOrderBy, AdminRegisteredPlatformOrdering)
    ? storedOrderBy
    : ADMIN_REGISTERED_PLATFORMS_DEFAULT_ORDER_BY;
  const orderMode = isValueInEnum(storedOrderMode, OrderingMode)
    ? storedOrderMode
    : ADMIN_REGISTERED_PLATFORMS_DEFAULT_ORDER_MODE;
  const pageSize = normalizeAdminRegisteredPlatformsPageSize(storedPageSize);

  useEffect(() => {
    if (orderBy !== storedOrderBy) {
      setOrderBy(orderBy);
    }
    if (orderMode !== storedOrderMode) {
      setOrderMode(orderMode);
    }
    if (pageSize !== storedPageSize) {
      setPageSize(pageSize);
    }
  }, [
    orderBy,
    storedOrderBy,
    setOrderBy,
    orderMode,
    storedOrderMode,
    setOrderMode,
    pageSize,
    storedPageSize,
    setPageSize,
  ]);

  const removeOrder = () => {
    removeOrderBy();
    removeOrderMode();
  };

  const resetAll = () => {
    removeOrder();
    removePageSize();
  };

  return {
    orderBy,
    setOrderBy,
    orderMode,
    setOrderMode,
    pageSize,
    setPageSize,
    removeOrder,
    resetAll,
  };
};
