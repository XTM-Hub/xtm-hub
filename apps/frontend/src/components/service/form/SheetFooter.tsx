import { useServiceContext } from '@/components/service/components/ServiceContext';
import { SheetFooter } from '@/components/ui/sheet';
import { useDialogContext } from '@/components/ui/SheetWithPreventingDialog';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { Button } from '@filigran/design-system';
import { DocumentStatus } from '@graphql/generated';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';

interface ServiceFormSheetFooterProps {
  status?: DocumentStatus;
}

export const ServiceFormSheetFooter = ({
  status,
}: ServiceFormSheetFooterProps) => {
  const t = useTranslate();
  const { isSubmitting } = useServiceContext();
  const { setIsDirty, setUploadsDirty } = useDialogContext();
  const {
    setValue,
    formState: { isDirty },
  } = useFormContext();

  const [pendingStatus, setPendingStatus] = useState<DocumentStatus>();

  useEffect(() => {
    setIsDirty(isDirty);
  }, [isDirty, setIsDirty]);

  // The sheet unmounts its content on close: the cleanup resets the dirty
  // state so the next opening does not inherit the previous one's.
  useEffect(
    () => () => {
      setIsDirty(false);
      setUploadsDirty(false);
    },
    [setIsDirty, setUploadsDirty]
  );

  const submitProps = (requested: DocumentStatus) => ({
    type: 'submit' as const,
    loading: isSubmitting && pendingStatus === requested,
    disabled: isSubmitting && pendingStatus !== requested,
    onClick: () => {
      setPendingStatus(requested);
      setValue('status', requested);
    },
  });

  const isInValidation = status === DocumentStatus.InValidation;
  const isPublished = status === DocumentStatus.Published;
  // Draft is the default, so an unknown status only ever offers to request validation
  const isDraft = !isInValidation && !isPublished;

  return (
    <SheetFooter className="sm:justify-between pt-2">
      <div className="ml-auto flex gap-2">
        {isDraft && (
          <>
            <Button
              {...analyticsId('resource_form_draft_submit')}
              priority="secondary"
              {...submitProps(DocumentStatus.Draft)}>
              {t('Service.Form.SaveAsDraft')}
            </Button>
            <Button
              {...analyticsId('resource_form_validation_submit')}
              {...submitProps(DocumentStatus.InValidation)}>
              {t('Service.Form.RequestValidation')}
            </Button>
          </>
        )}

        {isInValidation && (
          <>
            <Button
              {...analyticsId('resource_form_submit')}
              priority="secondary"
              {...submitProps(DocumentStatus.InValidation)}>
              {t('Service.Form.Save')}
            </Button>
            <Button
              {...analyticsId('resource_form_publication_submit')}
              {...submitProps(DocumentStatus.Published)}>
              {t('Service.Form.Publish')}
            </Button>
          </>
        )}

        {isPublished && (
          <Button
            {...analyticsId('resource_form_submit')}
            {...submitProps(DocumentStatus.Published)}>
            {t('Utils.Validate')}
          </Button>
        )}
      </div>
    </SheetFooter>
  );
};
