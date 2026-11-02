'use client';

import Loader from '@/components/Loader';
import PublicPathError from '@/components/PublicPathError';
import { RegistrationContextProvider } from '@/components/registration/Context';
import { Unregister } from '@/components/registration/unregister/Index';
import useDecodedQuery from '@/hooks/use-decoded-query';
import useMountingLoader from '@/hooks/use-mounting-loader';
import RegisterCanUnregisterPlatformQueryGraphql, {
  registerCanUnregisterPlatformQuery,
} from '@generated/registerCanUnregisterPlatformQuery.graphql';
import { PlatformIdentifier } from '@graphql/generated';
import { redirect, useParams } from 'next/navigation';
import { useQueryLoader } from 'react-relay';

export const PageLoader = () => {
  const { identifier } = useParams<{ identifier: PlatformIdentifier }>();
  if (!Object.values(PlatformIdentifier).includes(identifier)) {
    return (
      <PublicPathError
        error={{
          name: 'IDENTIFIER_NOT_FOUND',
          message: `ERROR when unregister : the identifier value is incorrect ${identifier}`,
        }}
      />
    );
  }

  const {
    platform_id: platformId,
    tenant_id: tenantId,
    state,
  } = useDecodedQuery();

  const [queryRef, loadQuery] =
    useQueryLoader<registerCanUnregisterPlatformQuery>(
      RegisterCanUnregisterPlatformQueryGraphql
    );
  useMountingLoader(loadQuery, { input: { platformId, tenantId } });
  if (!platformId) {
    return redirect('/');
  }

  return queryRef ? (
    <RegistrationContextProvider identifier={identifier}>
      <Unregister
        queryRef={queryRef}
        platformId={platformId}
        tenantId={tenantId}
        state={state ?? undefined}
      />
    </RegistrationContextProvider>
  ) : (
    <Loader />
  );
};
