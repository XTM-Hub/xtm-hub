'use client';

import { CONTRACT_LABEL_BY_CONTRACT } from '@/components/registration/PlatformIdentifierMapping';
import { registeredPlatformByServiceInstanceIdFragment } from '@/components/registration/register/register.graphql';
import { ConnectedProductButtons } from '@/components/service/registration/ConnectedProductButtons';
import { useTranslate } from '@/hooks/use-translate';
import { isWithinLastMonths } from '@/utils/date';
import { Badge } from '@filigran/ui';
import { registeredPlatformByServiceInstanceId_fragment$key } from '@generated/registeredPlatformByServiceInstanceId_fragment.graphql';
import { useFragment } from 'react-relay';

interface RegisteredPlatformHeaderProps {
  registeredPlatform: registeredPlatformByServiceInstanceId_fragment$key;
}

export const RegisteredPlatformHeader = ({
  registeredPlatform,
}: RegisteredPlatformHeaderProps) => {
  const t = useTranslate();

  const platform =
    useFragment<registeredPlatformByServiceInstanceId_fragment$key>(
      registeredPlatformByServiceInstanceIdFragment,
      registeredPlatform
    );
  const isConnectionStatusOk = isWithinLastMonths(
    new Date(platform.last_connectivity_check),
    1
  );

  return (
    <div className="flex flex-row">
      <div>
        <h1>{platform.title}</h1>
        <div className="flex gap-m">
          <Badge> {t(CONTRACT_LABEL_BY_CONTRACT[platform.contract])}</Badge>
          {isConnectionStatusOk ? (
            <Badge className="text-alert-success-primary">
              <span
                aria-hidden
                className="mr-xs size-2 rounded-full bg-alert-success-primary"
              />
              <span className="text-alert-success-primary">
                {t('Register.Details.ConnectionStatus.Connected')}
              </span>
            </Badge>
          ) : (
            <Badge variant="destructive">
              <span className="text-destructive">
                {t('Register.Details.ConnectionStatus.NotConnected')}
              </span>
            </Badge>
          )}
        </div>
      </div>
      <div className="ml-auto">
        <ConnectedProductButtons
          direction={'row'}
          platform={platform}
        />
      </div>
    </div>
  );
};
