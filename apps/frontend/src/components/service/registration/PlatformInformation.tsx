'use client';

import { RegistrationDetails } from '@/components/service/registration/RegistrationDetails';
import { RegistrationMetadata } from '@/components/service/registration/RegistrationMetadata';
import { useTranslate } from '@/hooks/use-translate';
import { Separator } from '@filigran/ui';
import { registeredPlatformByServiceInstanceId_fragment$key } from '@generated/registeredPlatformByServiceInstanceId_fragment.graphql';

interface PlatformInformationProps {
  registeredPlatform: registeredPlatformByServiceInstanceId_fragment$key;
}

export const PlatformInformation = ({
  registeredPlatform,
}: PlatformInformationProps) => {
  const t = useTranslate();

  return (
    <div className="mt-m p-xl bg-elevation-background-layer-2">
      <h2>{t('Register.Details.PlatformInformation')}</h2>
      <Separator className="m-m" />
      <div className="flex flex-row">
        <div>
          <h3>{t('Register.Details.RegistrationTitle')}</h3>
          <RegistrationDetails registeredPlatform={registeredPlatform} />
        </div>
        <div>
          <h3>{t('Register.Details.SubscriptionTitle')}</h3>
          <RegistrationMetadata registeredPlatform={registeredPlatform} />
        </div>
      </div>
    </div>
  );
};
