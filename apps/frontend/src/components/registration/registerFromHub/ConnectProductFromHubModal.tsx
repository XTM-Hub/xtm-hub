'use client';

import { PortalContext } from '@/components/me/AppPortalContext';
import { Administratorslist } from '@/components/registration/registerFromHub/Administratorslist';
import ConnectFromHubForm, {
  connectFromHubFormSchema,
} from '@/components/registration/registerFromHub/ConnectFromHubForm';
import { DialogInformative } from '@/components/ui/Dialog';
import useGranted from '@/hooks/use-granted';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  OrganizationCapability,
  useConnectProductOrganizationAdminsQuery,
} from '@graphql/generated';
import { z } from 'zod';

import { useRouter } from 'next/navigation';
import { useContext, useEffect } from 'react';

export enum ConnectProductOrigin {
  library = 'library',
  homepage = 'homepage',
}

interface ConnectProductProps {
  isOpen: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  origin: ConnectProductOrigin;
}

const DEFAULT_EMAIL_BODY = () => `Hello,

I don't have the required permissions to connect our Filigran product to XTM Hub.

Could you please connect it by visiting https://hub.filigran.io/en, clicking "Connect product", and following the steps?

Once it's connected, please let me know.

Thank you!`;

const ConnectProductFromHubModal = ({
  isOpen,
  onOpenChange,
  origin,
}: ConnectProductProps) => {
  const t = useTranslate();
  const { me } = useContext(PortalContext);
  const router = useRouter();
  const organizationId = me?.selected_organization_id ?? '';
  const canManageOrganization =
    useGranted(OrganizationCapability.AdministrateOrganization) ||
    useGranted(OrganizationCapability.ManagePlatformRegistration);
  const { data } = useConnectProductOrganizationAdminsQuery(
    portalGraphqlClient,
    {
      input: {
        organizationId,
        capabilities: [
          OrganizationCapability.ManagePlatformRegistration,
          OrganizationCapability.AdministrateOrganization,
        ],
      },
    },
    {
      enabled: isOpen && organizationId.length > 0,
    }
  );

  useEffect(() => {
    if (!me && isOpen) {
      router.push('/app');
    }
  }, [isOpen, me, router]);

  const allowedMessageTitle = t('Register.ConnectFromHub.ConnectProduct');
  const allowedMessage = t('Register.ConnectFromHub.RedirectionMessage');
  const allowedMessageDescription =
    origin === ConnectProductOrigin.library
      ? `${t('Register.ConnectFromHub.ConnectedProductSentence')}. \n\n ${allowedMessage}`
      : allowedMessage;
  const deniedMessage = t('Register.ConnectFromHub.PermissionRequired');
  const notAllowedMessage = t('Register.ConnectFromHub.NotAllowedMessage', {
    count: data?.usersWithCapabilitiesInOrganization?.length ?? 0,
  });
  const deniedMessageDescription =
    origin === ConnectProductOrigin.library
      ? `${t('Register.ConnectFromHub.ConnectedProductSentence')}. \n\n ${notAllowedMessage}`
      : notAllowedMessage;
  const administratorsEmails =
    data?.usersWithCapabilitiesInOrganization?.map((user) => user.email) ?? [];
  const [mainRecipientEmail, ...ccRecipientsEmails] = administratorsEmails;

  const handleClose = () => {
    onOpenChange?.(false);
  };

  const handleReachAdmin = () => {
    const to = mainRecipientEmail;
    const params = [
      `subject=${encodeURIComponent(`Request to connect a product to XTM Hub`)}`,
      `body=${encodeURIComponent(DEFAULT_EMAIL_BODY())}`,
    ];
    if (ccRecipientsEmails.length > 0) {
      params.push(`cc=${encodeURIComponent(ccRecipientsEmails.join(','))}`);
    }
    window.location.href = `mailto:${to}?${params.join('&')}`;
  };

  const handleConnectFromHub = ({
    productUrl,
  }: z.infer<typeof connectFromHubFormSchema>) => {
    window.open(
      `${productUrl}/redirect/connect-xtm-hub?from=xtmhub_${origin}`,
      '_blank',
      'noopener,noreferrer'
    );
    onOpenChange?.(false);
  };

  return (
    <DialogInformative
      isOpen={isOpen}
      onClose={handleClose}
      onButtonClick={canManageOrganization ? undefined : handleReachAdmin}
      variant={'default'}
      buttonText={'Register.ConnectFromHub.ReachAdmin'}
      title={canManageOrganization ? allowedMessageTitle : deniedMessage}
      description={
        canManageOrganization
          ? allowedMessageDescription
          : deniedMessageDescription
      }
      showFooter={!canManageOrganization}>
      {canManageOrganization ? (
        <>
          <div className="text-content-body-compact whitespace-pre-line">
            {t('Register.ConnectFromHub.MinimumVersionRequired', {
              openctiVersion: '7.260728.0',
              openaevVersion: '3.260729.0',
            })}
          </div>
          <ConnectFromHubForm onSubmit={handleConnectFromHub} />
        </>
      ) : (
        <Administratorslist admins={data} />
      )}
    </DialogInformative>
  );
};

export default ConnectProductFromHubModal;
