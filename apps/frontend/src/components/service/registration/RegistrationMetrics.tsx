'use client';

import { registeredPlatformByServiceInstanceIdFragment } from '@/components/registration/register/register.graphql';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { registeredPlatformByServiceInstanceId_fragment$key } from '@generated/registeredPlatformByServiceInstanceId_fragment.graphql';
import {
  CommercialModel,
  useRegisteredSaasPlatformMetricsQuery,
} from '@graphql/generated';
import { registrationKeys } from '@graphql/registration/registration.keys';
import { useEffect } from 'react';
import { useFragment } from 'react-relay';

interface RegistrationMetricsProps {
  registeredPlatform: registeredPlatformByServiceInstanceId_fragment$key;
}

export const RegistrationMetrics = ({
  registeredPlatform,
}: RegistrationMetricsProps) => {
  const platform =
    useFragment<registeredPlatformByServiceInstanceId_fragment$key>(
      registeredPlatformByServiceInstanceIdFragment,
      registeredPlatform
    );
  const isSaas = platform.commercial_model === CommercialModel.Saas;

  const variables = {
    input: { service_instance_id: platform.service_instance_id },
  };
  const { data } = useRegisteredSaasPlatformMetricsQuery(
    portalGraphqlClient,
    variables,
    {
      queryKey: registrationKeys.registeredSaasPlatformMetrics(variables),
      enabled: isSaas,
    }
  );
  const metrics = data?.registeredSaasPlatformMetrics;

  useEffect(() => {
    if (metrics !== undefined) {
      // TODO: temporary, until the metrics are displayed.
      // eslint-disable-next-line no-console
      console.log('Registered SaaS platform metrics', metrics);
    }
  }, [metrics]);

  return null;
};
