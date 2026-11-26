import { useAdminRegisteredPlatformsLocalstorage } from '@/components/admin/registered-platform/admin-registered-platforms-localstorage';
import {
  ADMIN_REGISTERED_PLATFORMS_DEFAULT_ORDER_BY,
  ADMIN_REGISTERED_PLATFORMS_MAX_PAGE_SIZE,
} from '@/components/admin/registered-platform/admin-registered-platforms.utils';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

const PAGE_SIZE_STORAGE_KEY = 'countAdminRegisteredPlatformsList';
const ORDER_BY_STORAGE_KEY = 'orderByAdminRegisteredPlatformsList';

describe('useAdminRegisteredPlatformsLocalstorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should cap a stored page size above what the API returns', () => {
    // Given
    localStorage.setItem(PAGE_SIZE_STORAGE_KEY, JSON.stringify(500));

    // When
    const { result } = renderHook(() =>
      useAdminRegisteredPlatformsLocalstorage()
    );

    // Then
    expect(result.current.pageSize).toBe(
      ADMIN_REGISTERED_PLATFORMS_MAX_PAGE_SIZE
    );
  });

  it('should sort on the default column when the stored one no longer exists', () => {
    // Given
    localStorage.setItem(ORDER_BY_STORAGE_KEY, JSON.stringify('unknown'));

    // When
    const { result } = renderHook(() =>
      useAdminRegisteredPlatformsLocalstorage()
    );

    // Then
    expect(result.current.orderBy).toBe(
      ADMIN_REGISTERED_PLATFORMS_DEFAULT_ORDER_BY
    );
  });
});
