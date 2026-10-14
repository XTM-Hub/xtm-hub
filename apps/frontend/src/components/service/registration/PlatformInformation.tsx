'use client';

import { RegistrationDetails } from '@/components/service/registration/RegistrationDetails';
import { RegistrationMetadata } from '@/components/service/registration/RegistrationMetadata';
import { RegistrationMetrics } from '@/components/service/registration/RegistrationMetrics';
import { Separator } from '@/components/ui/separator';
import { useTranslate } from '@/hooks/use-translate';
import { registeredPlatformByServiceInstanceId_fragment$key } from '@generated/registeredPlatformByServiceInstanceId_fragment.graphql';

interface PlatformInformationProps {
  registeredPlatform: registeredPlatformByServiceInstanceId_fragment$key;
}

export const PlatformInformation = ({
  registeredPlatform,
}: PlatformInformationProps) => {
  const t = useTranslate();

  return (
    <div className="my-m p-xl bg-elevation-background-layer-2">
      <h2>{t('Register.Details.PlatformInformation')}</h2>
      <Separator className="m-m" />
      <div className="grid grid-cols-2">
        <RegistrationDetails registeredPlatform={registeredPlatform} />
        <RegistrationMetadata registeredPlatform={registeredPlatform} />
      </div>
      <RegistrationMetrics registeredPlatform={registeredPlatform} />
    </div>
  );
};
