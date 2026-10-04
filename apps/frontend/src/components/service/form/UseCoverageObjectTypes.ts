import { portalGraphqlClient } from '@/lib/graphql-client';
import { useIntegrationCoverageObjectTypesQuery } from '@graphql/generated';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

/** Label of an object type without translation: "Some-New-Type" reads "Some new type". */
export const readableObjectType = (type: string) =>
  type
    .split('-')
    .map((word, index) =>
      index > 0 && /^[A-Z][a-z]+$/.test(word) ? word.toLowerCase() : word
    )
    .join(' ');

/** Translated label of a covered object type; its OpenCTI key stays the stored and filtered value. */
export const useCoverageObjectTypeLabel = () => {
  const t = useTranslations();
  return useCallback(
    (type: string) => {
      const key = `Service.OpenctiIntegrations.ObjectType.${type}`;
      return t.has(key) ? t(key) : readableObjectType(type);
    },
    [t]
  );
};

/** Every OpenCTI entity type the backend accepts as a covered object type, sorted by label. */
export const useCoverageObjectTypes = () => {
  const { data } = useIntegrationCoverageObjectTypesQuery(portalGraphqlClient);
  const labelOf = useCoverageObjectTypeLabel();

  return useMemo(
    () =>
      (data?.integrationCoverageObjectTypes ?? [])
        .map((type) => ({ id: type, name: labelOf(type) }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [data, labelOf]
  );
};
