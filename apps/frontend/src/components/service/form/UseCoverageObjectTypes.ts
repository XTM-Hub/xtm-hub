import { portalGraphqlClient } from '@/lib/graphql-client';
import { getEntityTypeLabel } from '@/utils/shareable-resources/entity-type';
import { useIntegrationCoverageObjectTypesQuery } from '@graphql/generated';
import { useMemo } from 'react';

/** Every OpenCTI entity type the backend accepts as a covered object type. */
export const useCoverageObjectTypes = () => {
  const { data } = useIntegrationCoverageObjectTypesQuery(portalGraphqlClient);

  return useMemo(
    () =>
      (data?.integrationCoverageObjectTypes ?? []).map((type) => ({
        id: type,
        name: getEntityTypeLabel(type),
      })),
    [data]
  );
};
