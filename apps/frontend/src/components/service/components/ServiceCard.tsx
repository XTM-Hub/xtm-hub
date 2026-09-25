'use client';
import { useServiceContext } from '@/components/service/components/ServiceContext';
import {
  CardTypeEnum,
  ServiceDelete,
} from '@/components/service/components/ServiceDelete';
import { ServiceManageSheet } from '@/components/service/components/ServiceManageSheet';
import { useDocumentContext } from '@/components/service/document/use-document-context';
import { IconActions, IconActionsItem } from '@/components/ui/IconActions';
import ShareableResourceCard from '@/components/ui/shareable-resource/ShareableResourceCard';
import useServiceCapability from '@/hooks/use-service-capability';
import { useTranslate } from '@/hooks/use-translate';
import revalidatePathActions from '@/utils/actions/revalidate-path.actions';
import {
  APP_PATH,
  PUBLIC_CYBERSECURITY_SOLUTIONS_PATH,
} from '@/utils/path/constant';
import {
  isIntegrationItem,
  ShareableResourceType,
} from '@/utils/shareable-resources/shareable-resources.types';
import { MoreVertIcon } from '@filigran/icon';
import { toast } from '@filigran/ui';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { IntegrationType, ServiceRestriction } from '@graphql/generated';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface ServiceCardProps {
  document: documentItem_fragment$data;
  detailUrl: string;
  shareLinkUrl: string;
  requiredProductVersion?: string;
  connectionId?: string;
}

const ServiceCard = ({
  document,
  detailUrl,
  shareLinkUrl,
  connectionId,
}: ServiceCardProps) => {
  const t = useTranslate();
  const router = useRouter();

  const [openSheet, setOpenSheet] = useState(false);

  const { serviceInstance, setIntegrationType, translationKey } =
    useServiceContext();
  const context = useDocumentContext({
    serviceInstance,
    connectionId,
    type: document.type as ShareableResourceType,
  });

  const userCanUpdate = useServiceCapability(
    ServiceRestriction.Upload,
    serviceInstance
  );

  const userCanDelete = useServiceCapability(
    ServiceRestriction.Delete,
    serviceInstance
  );

  const onClickOnUpdate = () => {
    if (document && isIntegrationItem(document)) {
      setIntegrationType(
        (document.integration_type as IntegrationType) ??
          IntegrationType.CsvFeed
      );
    }

    setOpenSheet(true);
  };

  function onDeleteCompleted() {
    revalidatePathActions([
      `/${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/${serviceInstance.slug}`,
    ]).then(() => {
      router.push(
        `/${APP_PATH}/service/${serviceInstance.service_definition!.identifier}/${serviceInstance.id}`
      );
    });
    toast({
      title: t('Utils.Success'),
      description: t(`${translationKey}.Actions.Deleted`, {
        name: document?.name ?? '',
      }),
    });
  }
  return (
    <ShareableResourceCard
      key={document.id}
      document={document}
      detailUrl={detailUrl}
      shareLinkUrl={shareLinkUrl}
      serviceInstance={serviceInstance}
      extraContent={
        <>
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
                    (document && isIntegrationItem(document)
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
        </>
      }
    />
  );
};

export default ServiceCard;
