'use client';

import Loader from '@/components/Loader';
import { RegistrationContextProvider } from '@/components/registration/Context';
import { Register } from '@/components/registration/register';
import useDecodedQuery from '@/hooks/use-decoded-query';
import useMountingLoader from '@/hooks/use-mounting-loader';
import { getUrlOrigin } from '@/utils/external-url';
import RegisterIsPlatformRegisteredQueryGraphql, {
  registerIsPlatformRegisteredQuery,
} from '@generated/registerIsPlatformRegisteredQuery.graphql';
import {
  PlatformContract,
  PlatformInput,
} from '@generated/registerPlatformMutation.graphql';
import { PlatformIdentifier } from '@graphql/generated';
import { redirect, useParams } from 'next/navigation';
import { useQueryLoader } from 'react-relay';

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

  const [queryRef, loadQuery] =
    useQueryLoader<registerIsPlatformRegisteredQuery>(
      RegisterIsPlatformRegisteredQueryGraphql
    );
  useMountingLoader(loadQuery, {
    input: { platformId: platform_id, tenantId: tenant_id },
  });

  const platform: PlatformInput = {
    id: platform_id,
    title: platform_title,
    url: platform_url,
    contract: platform_contract as PlatformContract,
    version: platform_version,
    tenantId: tenant_id,
  };

  return queryRef ? (
    <RegistrationContextProvider identifier={identifier}>
      <Register
        queryRef={queryRef}
        platform={platform}
        platformOrigin={platformOrigin}
        state={state ?? undefined}
      />
    </RegistrationContextProvider>
  ) : (
    <Loader />
  );
};
