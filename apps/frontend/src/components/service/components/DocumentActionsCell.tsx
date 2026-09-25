'use client';

import { useServiceContext } from '@/components/service/components/ServiceContext';
import {
  CardTypeEnum,
  ServiceDelete,
} from '@/components/service/components/ServiceDelete';
import { ServiceManageSheet } from '@/components/service/components/ServiceManageSheet';
import { useDocumentContext } from '@/components/service/document/use-document-context';
import { SettingsContext } from '@/components/settings/EnvPortalContext';
import { IconActions, IconActionsItem } from '@/components/ui/IconActions';
import { ShareLinkButton } from '@/components/ui/share-link/ShareLinkButton';
import useServiceCapability from '@/hooks/use-service-capability';
import revalidatePathActions from '@/utils/actions/revalidate-path.actions';
import {
  APP_PATH,
  PUBLIC_CYBERSECURITY_SOLUTIONS_PATH,
} from '@/utils/path/constant';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { IntegrationType, ServiceRestriction } from '@graphql/generated';
import { useContext, useState } from 'react';

import { useTranslate } from '@/hooks/use-translate';
import {
  isIntegrationItem,
  ShareableResourceType,
} from '@/utils/shareable-resources/shareable-resources.types';
import { MoreVertIcon } from '@filigran/icon';
import { toast } from '@filigran/ui';
import { useRouter } from 'next/navigation';

interface DocumentActionsCellProps {
  document: documentItem_fragment$data;
}

export const DocumentActionsCell = ({ document }: DocumentActionsCellProps) => {
  const { settings } = useContext(SettingsContext);
  const { serviceInstance, translationKey, setIntegrationType } =
    useServiceContext();
  const t = useTranslate();
  const router = useRouter();
  const [openSheet, setOpenSheet] = useState(false);

  const userCanUpdate = useServiceCapability(
    ServiceRestriction.Upload,
    serviceInstance
  );
  const userCanDelete = useServiceCapability(
    ServiceRestriction.Delete,
    serviceInstance
  );

  const onClickOnUpdate = () => {
    if (isIntegrationItem(document)) {
      setIntegrationType(
        (document.integration_type as IntegrationType) ??
          IntegrationType.CsvFeed
      );
    }

    setOpenSheet(true);
  };

  const context = useDocumentContext({
    serviceInstance,
    type: document.type as ShareableResourceType,
  });

  function onDeleteCompleted() {
    revalidatePathActions([
      `/${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/${serviceInstance.slug}`,
    ]).then(() => {
      router.push(
        `/${APP_PATH}/service/${serviceInstance.service_definition!.identifier}/${serviceInstance.id}`
      );
      toast({
        title: t('Utils.Success'),
        description: t(`${translationKey}.Actions.Deleted`, {
          name: document.name ?? '',
        }),
      });
    });
  }

  return (
    <div
      className="flex items-center gap-xs"
      onClick={(event) => event.stopPropagation()}>
      <ShareLinkButton
        documentId={document.id}
        url={`${settings!.base_url_front}/${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/${serviceInstance.slug}/${document.slug}`}
      />
      {(userCanDelete || userCanUpdate) && (
        <IconActions
          className="z-[2]"
          icon={
            <>
              <MoreVertIcon className="h-4 w-4 text-primary" />
              <span className="sr-only">{t('Utils.OpenMenu')}</span>
            </>
          }>
          {userCanUpdate && (
            <IconActionsItem onClick={() => onClickOnUpdate()}>
              {t('MenuActions.Update')}
            </IconActionsItem>
          )}
          {userCanDelete && (
            <ServiceDelete
              type={'menuitem'}
              userCanDelete={userCanDelete}
              onDelete={() =>
                context.handleDeleteSheet(document, onDeleteCompleted)
              }
              serviceName={serviceInstance.name}
              integrationType={
                (isIntegrationItem(document)
                  ? document.integration_type
                  : document.type) as CardTypeEnum
              }
            />
          )}
        </IconActions>
      )}
      {userCanUpdate && (
        <ServiceManageSheet
          document={document}
          open={openSheet}
          setOpen={setOpenSheet}
        />
      )}
    </div>
  );
};
