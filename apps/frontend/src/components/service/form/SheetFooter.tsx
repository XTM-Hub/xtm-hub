import { useServiceContext } from '@/components/service/components/ServiceContext';
import { SheetFooter } from '@/components/ui/sheet';
import { useDialogContext } from '@/components/ui/SheetWithPreventingDialog';
import { useTranslate } from '@/hooks/use-translate';
import {
  analyticsId,
  type AnalyticsElementId,
} from '@/lib/analytics/analytics.ids';
import { Button } from '@filigran/design-system';
import { DocumentStatus } from '@graphql/generated';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';

interface ServiceFormSheetFooterProps {
  status?: DocumentStatus;
}

interface FooterAction {
  requested: DocumentStatus;
  labelKey: string;
  analyticsId: AnalyticsElementId;
}

// A new status has to say which actions it offers: the compiler asks for it
const FOOTER_ACTIONS: Record<
  DocumentStatus,
  { secondary?: FooterAction; primary: FooterAction }
> = {
  [DocumentStatus.Draft]: {
    secondary: {
      requested: DocumentStatus.Draft,
      labelKey: 'Service.Form.SaveAsDraft',
      analyticsId: 'resource_form_draft_submit',
    },
    primary: {
      requested: DocumentStatus.InValidation,
      labelKey: 'Service.Form.RequestValidation',
      analyticsId: 'resource_form_validation_submit',
    },
  },
  [DocumentStatus.InValidation]: {
    secondary: {
      requested: DocumentStatus.InValidation,
      labelKey: 'Service.Form.Save',
      analyticsId: 'resource_form_submit',
    },
    primary: {
      requested: DocumentStatus.Published,
      labelKey: 'Service.Form.Publish',
      analyticsId: 'resource_form_publication_submit',
    },
  },
  [DocumentStatus.Published]: {
    primary: {
      requested: DocumentStatus.Published,
      labelKey: 'Utils.Validate',
      analyticsId: 'resource_form_submit',
    },
  },
};

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

  const { secondary, primary } = FOOTER_ACTIONS[status ?? DocumentStatus.Draft];

  return (
    <SheetFooter className="sm:justify-between pt-2">
      <div className="ml-auto flex gap-2">
        {secondary && (
          <Button
            {...analyticsId(secondary.analyticsId)}
            priority="secondary"
            {...submitProps(secondary.requested)}>
            {t(secondary.labelKey)}
          </Button>
        )}
        <Button
          {...analyticsId(primary.analyticsId)}
          {...submitProps(primary.requested)}>
          {t(primary.labelKey)}
        </Button>
      </div>
    </SheetFooter>
  );
};
