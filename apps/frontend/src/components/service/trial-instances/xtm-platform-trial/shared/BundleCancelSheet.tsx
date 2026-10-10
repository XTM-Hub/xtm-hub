'use client';

import { invalidatePrivateNavigationQueries } from '@/components/menu/navigation/private/private-navigation-query-invalidation';
import { SelectWithEditableField } from '@/components/service/registration/SelectWithEditableField';
import { CancelDeploymentRequestMutation } from '@/components/service/trial-instances/trial-instances.graphql';
import { useFormField } from '@/components/ui/form';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@filigran/design-system';
import { WarningIcon } from '@filigran/icon';
import { AutoForm } from '@filigran/ui';
import { trialInstancesCancelDeploymentRequestMutation } from '@generated/trialInstancesCancelDeploymentRequestMutation.graphql';
import { xtmPlatformBundleKeys } from '@graphql/deployment/deployment.keys';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { ControllerRenderProps, FieldValues } from 'react-hook-form';
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

const CancellationReasonField = ({
  field,
  onReasonChange,
}: {
  field: ControllerRenderProps<FieldValues, string>;
  onReasonChange: (reason: string) => void;
}) => {
  const t = useTranslate();
  const { error } = useFormField();
  const cancellationReasons = REASONS.map((reason) => ({
    value: reason,
    label: t(`Service.Trials.CancellationReason.${reason}`),
  }));

  return (
    <SelectWithEditableField
      value={field.value}
      onChange={(value) => {
        field.onChange(value);
        onReasonChange(value);
      }}
      options={cancellationReasons}
      required
      error={error?.message}
      labels={{
        label: t(
          'Service.Trials.Cancellation.ConfirmationForm.CancellationReason'
        ),
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
  );
};

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
  const t = useTranslate();
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
  const [selectedCancellationReason, setSelectedCancellationReason] =
    useState('');
  // A new fieldType on each render would remount the field and drop the focus
  // and the draft of the "Other" text, which reports every keystroke here.
  const cancellationReasonFieldType = useCallback(
    ({ field }: { field: ControllerRenderProps<FieldValues, string> }) => (
      <CancellationReasonField
        field={field}
        onReasonChange={setSelectedCancellationReason}
      />
    ),
    []
  );

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
        showSnackbar({
          severity: 'success',
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
        showSnackbar({
          severity: 'error',
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
      <DialogContent>
        <DialogTitle>{t('XtmPlatformTrial.CancelDialog.Title')}</DialogTitle>
        <DialogDescription>
          {t('XtmPlatformTrial.CancelDialog.Description')}
        </DialogDescription>
        <DialogBody>
          <AutoForm
            formSchema={bundleCancelSchema}
            onSubmit={onSubmit}
            fieldConfig={{
              cancellation_reason: {
                label: t(
                  'Service.Trials.Cancellation.ConfirmationForm.CancellationReason'
                ),
                fieldType: cancellationReasonFieldType,
              },
            }}>
            <div className="mt-l flex items-center gap-xs rounded border border-solid border-red p-s">
              <WarningIcon className="size-4 shrink-0 text-destructive" />
              <div className="content-body-compact text-text-default-primary">
                <span>{t('XtmPlatformTrial.CancelDialog.Warning')}</span>
              </div>
            </div>
            <DialogFooter>
              <Button
                priority="secondary"
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
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};
