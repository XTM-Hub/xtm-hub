'use client';

import { invalidatePrivateNavigationQueries } from '@/components/menu/navigation/private/private-navigation-query-invalidation';
import { SelectWithEditableField } from '@/components/service/registration/SelectWithEditableField';
import { CancelDeploymentRequestMutation } from '@/components/service/trial-instances/trial-instances.graphql';
import { WarningIcon } from '@filigran/icon';
import {
  AutoForm,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormItem,
  FormLabel,
  FormMessage,
  toast,
} from '@filigran/ui';
import { trialInstancesCancelDeploymentRequestMutation } from '@generated/trialInstancesCancelDeploymentRequestMutation.graphql';
import { xtmPlatformBundleKeys } from '@graphql/deployment/deployment.keys';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useMutation } from 'react-relay';
import { z } from 'zod';

const buildBundleCancelSchema = (requiredMessage: string) =>
  z.object({
    cancellation_reason: z.string().min(1, requiredMessage),
  });

type BundleCancelSchema = ReturnType<typeof buildBundleCancelSchema>;

const REASONS = [
  'value',
  'compatibility',
  'complexity',
  'legal-security',
  'expertise',
];

interface BundleCancelSheetProps {
  deploymentRequestId: string;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const BundleCancelSheet = ({
  deploymentRequestId,
  open,
  setOpen,
}: BundleCancelSheetProps) => {
  const t = useTranslations();
  const bundleCancelSchema = useMemo(
    () =>
      buildBundleCancelSchema(
        t(
          'Service.Trials.Cancellation.ConfirmationForm.CancellationReasonRequired'
        )
      ),
    [t]
  );
  const queryClient = useQueryClient();
  const cancellationReasons = REASONS.map((reason) => ({
    value: reason,
    label: t(`Service.Trials.CancellationReason.${reason}`),
  }));
  const [selectedCancellationReason, setSelectedCancellationReason] =
    useState('');

  const [cancelDeploymentRequestMutation] =
    useMutation<trialInstancesCancelDeploymentRequestMutation>(
      CancelDeploymentRequestMutation
    );

  const onSubmit = (values: z.infer<BundleCancelSchema>) => {
    cancelDeploymentRequestMutation({
      variables: {
        deploymentRequestId,
        cancellationReason: values.cancellation_reason,
      },
      onCompleted: () => {
        toast({
          title: t('Utils.Success'),
          description: t(
            'Service.Trials.Cancellation.Toast.NoNewTrialPossible'
          ),
        });
        invalidatePrivateNavigationQueries(queryClient);
        queryClient.invalidateQueries({
          queryKey: xtmPlatformBundleKeys.all(),
        });
        setOpen(false);
      },
      onError: (error) => {
        toast({
          variant: 'destructive',
          title: t('Utils.Error'),
          description: t(`Error.Server.${error.message}`),
        });
      },
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSelectedCancellationReason('');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[32rem]">
        <DialogHeader className="gap-s">
          <DialogTitle>{t('XtmPlatformTrial.CancelDialog.Title')}</DialogTitle>
          <DialogDescription>
            {t('XtmPlatformTrial.CancelDialog.Description')}
          </DialogDescription>
        </DialogHeader>
        <AutoForm
          className="mt-s"
          formSchema={bundleCancelSchema}
          onSubmit={onSubmit}
          fieldConfig={{
            cancellation_reason: {
              label: t(
                'Service.Trials.Cancellation.ConfirmationForm.CancellationReason'
              ),
              fieldType: ({ field }) => (
                <FormItem>
                  <FormLabel className="content-body-compact-medium text-text-default-secondary">
                    {t(
                      'Service.Trials.Cancellation.ConfirmationForm.CancellationReason'
                    )}
                    <span>*</span>
                  </FormLabel>
                  <SelectWithEditableField
                    value={field.value}
                    onChange={(value) => {
                      field.onChange(value);
                      setSelectedCancellationReason(value);
                    }}
                    options={cancellationReasons}
                    labels={{
                      placeholder: t(
                        'Service.Trials.Cancellation.ConfirmationForm.CancellationReasonPlaceholder'
                      ),
                      editableFieldLabel: t(
                        'Service.Trials.Cancellation.ConfirmationForm.CancellationReasonOther'
                      ),
                      editableFieldPlaceholder: t(
                        'Service.Trials.Cancellation.ConfirmationForm.CancellationReasonOtherPlaceholder'
                      ),
                    }}
                    editableFieldValue="Other"
                  />
                  <FormMessage className="text-sm text-destructive" />
                </FormItem>
              ),
            },
          }}>
          <div className="mt-l flex items-center gap-xs rounded border border-solid border-red p-s">
            <WarningIcon className="size-4 shrink-0 text-destructive" />
            <div className="content-body-compact text-text-default-primary">
              <span>{t('XtmPlatformTrial.CancelDialog.Warning')}</span>
            </div>
          </div>
          <DialogFooter className="justify-end gap-s">
            <Button
              variant="outline"
              type="button"
              onClick={() => setOpen(false)}>
              {t('Utils.Cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={!selectedCancellationReason.trim()}
              type="submit">
              {t('Utils.Confirm')}
            </Button>
          </DialogFooter>
        </AutoForm>
      </DialogContent>
    </Dialog>
  );
};
