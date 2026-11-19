'use client';

import Loader from '@/components/Loader';
import PublicPathError from '@/components/PublicPathError';
import { RegistrationContextProvider } from '@/components/registration/Context';
import { Unregister } from '@/components/registration/unregister/Index';
import useDecodedQuery from '@/hooks/use-decoded-query';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { throwOnFirstLoadError } from '@/lib/query-client';
import {
  PlatformIdentifier,
  useCanUnregisterPlatformQuery,
} from '@graphql/generated';
import { registrationKeys } from '@graphql/registration/registration.keys';
import { redirect, useParams } from 'next/navigation';

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

  if (!platformId) {
    return redirect('/');
  }

  return (
    <UnregisterLoader
      identifier={identifier}
      platformId={platformId}
      tenantId={tenantId ?? null}
      state={state ?? undefined}
    />
  );
};

interface UnregisterLoaderProps {
  identifier: PlatformIdentifier;
  platformId: string;
  tenantId: string | null;
  state?: string;
}

// Only rendered once the platform id is known, so the query never runs without it.
const UnregisterLoader = ({
  identifier,
  platformId,
  tenantId,
  state,
}: UnregisterLoaderProps) => {
  const variables = { input: { platformId, tenantId } };
  // Loaded in the browser only: the unregistration posts its result to the opener window.
  const { data } = useCanUnregisterPlatformQuery(
    portalGraphqlClient,
    variables,
    {
      queryKey: registrationKeys.canUnregisterPlatform(variables),
      // Loaded once: the popup regains focus often, and a refetch would hand the flow in progress a new
      // status. A query that is never stale is not refetched on focus, mount or reconnect.
      staleTime: Infinity,
      throwOnError: throwOnFirstLoadError,
    }
  );

  return data ? (
    <RegistrationContextProvider identifier={identifier}>
      <Unregister
        canUnregisterPlatform={data.canUnregisterPlatform}
        platformId={platformId}
        tenantId={tenantId}
        state={state}
      />
    </RegistrationContextProvider>
  ) : (
    <Loader />
  );
};
