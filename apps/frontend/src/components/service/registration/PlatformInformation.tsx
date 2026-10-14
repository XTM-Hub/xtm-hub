'use client';

import { RegistrationDetails } from '@/components/service/registration/RegistrationDetails';
import { RegistrationMetadata } from '@/components/service/registration/RegistrationMetadata';
import { Separator } from '@/components/ui/separator';
import { useIsFeatureEnabled } from '@/hooks/use-is-feature-enabled';
import { useTranslate } from '@/hooks/use-translate';
import { registeredPlatformByServiceInstanceId_fragment$key } from '@generated/registeredPlatformByServiceInstanceId_fragment.graphql';
import { FeatureFlag } from '@graphql/generated';

interface PlatformInformationProps {
  registeredPlatform: registeredPlatformByServiceInstanceId_fragment$key;
}

export const PlatformInformation = ({
  registeredPlatform,
}: PlatformInformationProps) => {
  const t = useTranslate();
  const isSaasMetricsEnabled = useIsFeatureEnabled(FeatureFlag.SaasMetrics);

  return (
    <div className="my-m p-xl bg-elevation-background-layer-2">
      <h2>{t('Register.Details.PlatformInformation')}</h2>
      <Separator className="m-m" />
      <div className="grid grid-cols-2">
        <RegistrationDetails registeredPlatform={registeredPlatform} />
        {isSaasMetricsEnabled && (
          <RegistrationMetadata registeredPlatform={registeredPlatform} />
        )}
      </div>
    </div>
  );
};
