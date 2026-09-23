'use client';
import { Button, toast } from '@filigran/ui';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { ServiceRestriction } from '@graphql/generated';

import { useServiceContext } from '@/components/service/components/ServiceContext';
import { ServiceFormValues } from '@/components/service/components/subscribable-services.types';

import { SheetWithPreventingDialog } from '@/components/ui/SheetWithPreventingDialog';
import useServiceCapability from '@/hooks/use-service-capability';
import { useTranslate } from '@/hooks/use-translate';
import revalidatePathActions from '@/utils/actions/revalidate-path.actions';
import { PUBLIC_CYBERSECURITY_SOLUTIONS_PATH } from '@/utils/path/constant';
import { useState } from 'react';

interface ServiceManageSheetProps {
  document?: documentItem_fragment$data;
  variant?: 'menu' | 'button';
  open?: boolean;
  setOpen?: (open: boolean) => void;
}

export const ServiceManageSheet = ({
  document,
  variant,
  open: externalOpen,
  setOpen: externalSetOpen,
}: ServiceManageSheetProps) => {
  const t = useTranslate();
  const [internalOpenSheet, setInternalOpenSheet] = useState(false);

  // Use external state if provided, otherwise use internal state
  const openSheet =
    externalOpen !== undefined ? externalOpen : internalOpenSheet;
  const setOpenSheet =
    externalSetOpen !== undefined ? externalSetOpen : setInternalOpenSheet;

  const {
    serviceInstance,
    translationKey,
    ServiceForm,
    handleAddSheet,
    handleUpdateSheet,
  } = useServiceContext();

  const userCanUpdate = useServiceCapability(
    ServiceRestriction.Upload,
    serviceInstance
  );

  function onUpdateSuccess(serviceName: string) {
    // If the service has changed, we need to revalidate the path
    // If the slug has changed, it's necessary to revalidate the previous path, as the new one may not yet be cached.
    revalidatePathActions([
      `/${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/${serviceInstance.slug}/${document!.slug}`,
      `/${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/${serviceInstance.slug}`,
    ]);
    setOpenSheet(false);
    toast({
      title: t('Utils.Success'),
      description: t('VaultActions.DocumentUpdated', {
        file_name: serviceName,
      }),
    });
  }
  function onError(error: Error) {
    toast({
      variant: 'destructive',
      title: t('Utils.Error'),
      description: t(`Error.Server.${error.message}`),
    });
  }

  function onCreateSuccess(serviceName: string) {
    setOpenSheet(false);

    toast({
      title: t('Utils.Success'),
      description: t(`${translationKey}.Actions.Added`, {
        name: serviceName,
      }),
    });
  }

  // we are in update/delete case
  if (document) {
    return (
      <>
        {userCanUpdate && (
          <SheetWithPreventingDialog
            open={openSheet}
            setOpen={setOpenSheet}
            trigger={
              variant === 'button' ? (
                <Button variant="secondary">{t('Utils.Update')}</Button>
              ) : undefined
            }
            title={t(`${translationKey}.UpdateService`, {
              name: document.name ?? '',
            })}>
            {
              <ServiceForm
                document={document}
                handleSubmit={(values: ServiceFormValues) =>
                  handleUpdateSheet(values, document, onUpdateSuccess, onError)
                }
              />
            }
          </SheetWithPreventingDialog>
        )}
      </>
    );
  }

  // we are in new case
  return (
    <>
      {userCanUpdate && (
        <SheetWithPreventingDialog
          open={openSheet}
          setOpen={setOpenSheet}
          trigger={
            variant === 'button' ? (
              <Button>{t(`${translationKey}.AddService`)}</Button>
            ) : undefined
          }
          title={t(`${translationKey}.AddService`)}>
          {
            <ServiceForm
              handleSubmit={(values: ServiceFormValues) =>
                handleAddSheet(values, onCreateSuccess, onError)
              }
              document={undefined}
            />
          }
        </SheetWithPreventingDialog>
      )}
    </>
  );
};
