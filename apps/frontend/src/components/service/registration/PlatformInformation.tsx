'use client';

import { RegistrationDetails } from '@/components/service/registration/RegistrationDetails';
import { RegistrationMetadata } from '@/components/service/registration/RegistrationMetadata';
import { Separator } from '@/components/ui/separator';
import { useTranslate } from '@/hooks/use-translate';
import { registeredPlatformByServiceInstanceId_fragment$key } from '@generated/registeredPlatformByServiceInstanceId_fragment.graphql';
import { SaasPlatformMetadata } from '@graphql/generated';

interface PlatformInformationProps {
  registeredPlatform: registeredPlatformByServiceInstanceId_fragment$key;
  showMetadata: boolean;
  metadata?: SaasPlatformMetadata | null;
  isMetadataLoading: boolean;
}

export const PlatformInformation = ({
  registeredPlatform,
  showMetadata,
  metadata,
  isMetadataLoading,
}: PlatformInformationProps) => {
  const t = useTranslate();

  return (
    <div className="my-3 layer-2 bg-filigran-brand-primary-transparency-10 p-6">
      <h2>{t('Register.Details.PlatformInformation')}</h2>
      <Separator className="m-3" />
      <div className="grid grid-cols-2">
        <RegistrationDetails registeredPlatform={registeredPlatform} />
        {showMetadata && (
          <RegistrationMetadata
            metadata={metadata}
            isLoading={isMetadataLoading}
          />
        )}
      </div>
    </div>
  );
};
