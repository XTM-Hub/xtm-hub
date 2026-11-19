'use client';

import Loader from '@/components/Loader';
import { RegistrationContextProvider } from '@/components/registration/Context';
import { Register } from '@/components/registration/register';
import useDecodedQuery from '@/hooks/use-decoded-query';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { throwOnFirstLoadError } from '@/lib/query-client';
import { getUrlOrigin } from '@/utils/external-url';
import {
  PlatformContract,
  PlatformIdentifier,
  PlatformInput,
  useIsPlatformRegisteredQuery,
} from '@graphql/generated';
import { registrationKeys } from '@graphql/registration/registration.keys';
import { redirect, useParams } from 'next/navigation';

export const PageLoader = () => {
  const { identifier } = useParams<{ identifier: PlatformIdentifier }>();
  if (!Object.values(PlatformIdentifier).includes(identifier)) {
    return redirect('/');
  }

  const {
    platform_id,
    platform_title,
    platform_url,
    platform_contract,
    platform_version,
    tenant_id,
    state,
  } = useDecodedQuery();

  // The platform is only messaged on this origin: without one, it could never get the result.
  const platformOrigin = getUrlOrigin(platform_url);
  const areParametersValid =
    platform_id &&
    platform_title &&
    platform_url &&
    platformOrigin &&
    platform_contract;
  if (!areParametersValid) {
    return redirect('/');
  }

  const variables = {
    input: { platformId: platform_id, tenantId: tenant_id ?? null },
  };
  // Loaded in the browser only: the registration posts its result to the opener window.
  const { data } = useIsPlatformRegisteredQuery(
    portalGraphqlClient,
    variables,
    {
      queryKey: registrationKeys.isPlatformRegistered(variables),
      // Loaded once: the popup regains focus often, and a refetch would hand the flow in progress a new
      // status. A query that is never stale is not refetched on focus, mount or reconnect.
      staleTime: Infinity,
      throwOnError: throwOnFirstLoadError,
    }
  );

  const platform: PlatformInput = {
    id: platform_id,
    title: platform_title,
    url: platform_url,
    contract: platform_contract as PlatformContract,
    version: platform_version ?? null,
    tenantId: tenant_id ?? null,
    tenantName: null,
  };

  return data ? (
    <RegistrationContextProvider identifier={identifier}>
      <Register
        isPlatformRegistered={data.isPlatformRegistered}
        platform={platform}
        platformOrigin={platformOrigin}
        state={state ?? undefined}
      />
    </RegistrationContextProvider>
  ) : (
    <Loader />
  );
};
