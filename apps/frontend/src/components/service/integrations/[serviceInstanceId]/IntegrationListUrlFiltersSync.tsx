'use client';

import { useIntegrationListStorage } from '@/components/service/integrations/[serviceInstanceId]/use-integration-list-storage';
import { useIntegrationListUrlFilters } from '@/components/service/integrations/[serviceInstanceId]/use-integration-list-url-filters';

export const IntegrationListUrlFiltersSync = () => {
  const { filters, setFilters } = useIntegrationListStorage();

  useIntegrationListUrlFilters({ filters, setFilters });

  return null;
};
