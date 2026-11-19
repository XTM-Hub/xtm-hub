'use client';

import { PortalContext } from '@/components/me/AppPortalContext';
import { CONTRACT_LABEL_BY_CONTRACT } from '@/components/registration/PlatformIdentifierMapping';
import { ConnectedProductButtons } from '@/components/service/registration/ConnectedProductButtons';
import { useTranslate } from '@/hooks/use-translate';
import { isWithinLastMonths } from '@/utils/date';
import { Chip, Icon } from '@filigran/design-system';
import {
  PlatformContract,
  RegisteredPlatformDetailsFragment,
} from '@graphql/generated';
import { useContext } from 'react';

interface RegisteredPlatformHeaderProps {
  platform: RegisteredPlatformDetailsFragment;
  showOrganization: boolean;
}

export const RegisteredPlatformHeader = ({
  platform,
  showOrganization,
}: RegisteredPlatformHeaderProps) => {
  const t = useTranslate();

  const { me } = useContext(PortalContext);

  const shouldDisplayHeaderButtons =
    me?.selected_organization_id === platform.subscription?.organization.id;
  const isConnectionStatusOk = isWithinLastMonths(
    new Date(platform.last_connectivity_check),
    1
  );

  return (
    <div className="flex flex-row">
      <div>
        {platform.contract === PlatformContract.Trial ? (
          <h2>{platform.title}</h2>
        ) : (
          <h1>{platform.title}</h1>
        )}

        <div className="flex gap-3">
          <Chip
            label={t(CONTRACT_LABEL_BY_CONTRACT[platform.contract])}
            severity={
              platform.contract === PlatformContract.Ee ? 'ee' : 'neutral'
            }
          />
          <Chip
            label={t(
              isConnectionStatusOk
                ? 'Register.Details.ConnectionStatus.Connected'
                : 'Register.Details.ConnectionStatus.NotConnected'
            )}
            severity={isConnectionStatusOk ? 'low' : 'critical'}
          />
          {showOrganization && platform.organization && (
            <Chip
              label={t('Register.Details.OrganizationName', {
                name: platform.organization.name,
              })}
              startIcon={<Icon name="building-2" />}
            />
          )}
        </div>
      </div>
      {shouldDisplayHeaderButtons && (
        <div className="ml-auto">
          <ConnectedProductButtons platform={platform} />
        </div>
      )}
    </div>
  );
};
