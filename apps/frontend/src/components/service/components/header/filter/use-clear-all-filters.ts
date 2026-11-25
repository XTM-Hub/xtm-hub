import { useServiceListStorageKeyContext } from '@/components/service/components/ServiceListStorageKeyContext';
import { useServiceListStorage } from '@/hooks/use-service-list-storage';
import { useRef } from 'react';

export const useClearAllFilters = () => {
  const { storageKey } = useServiceListStorageKeyContext();
  const { hasActiveFilters, clearFilters } = useServiceListStorage(storageKey);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const focusHeading = () => headingRef.current?.focus();

  const clearAll = () => {
    clearFilters();
    // The clicked button unmounts: keep the focus on the heading.
    focusHeading();
  };

  return { headingRef, hasActiveFilters, focusHeading, clearAll };
};
