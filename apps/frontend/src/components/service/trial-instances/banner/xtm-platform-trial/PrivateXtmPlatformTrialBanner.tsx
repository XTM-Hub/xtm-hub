'use client';

import { PortalContext } from '@/components/me/AppPortalContext';
import { XtmPlatformTrialBanner } from '@/components/service/trial-instances/banner/xtm-platform-trial/XtmPlatformTrialBanner';
import { deriveXtmPlatformTrialState } from '@/components/service/trial-instances/banner/xtm-platform-trial/xtm-platform-trial-banner.utils';
import { SettingsContext } from '@/components/settings/EnvPortalContext';
import { AutoForm } from '@/components/ui/auto-form';
import { FormControl, FormItem, FormMessage } from '@/components/ui/form';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { APP_PATH } from '@/utils/path/constant';
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogTitle,
  Radio,
  RadioGroup,
  Textarea,
} from '@filigran/design-system';
import {
  HasRepliedSatisfaction,
  PlatformTrialStatusQueryVariables,
  useGiveDeploymentFeedbackMutation,
  usePlatformTrialStatusQuery,
} from '@graphql/generated';
import { platformTrialKeys } from '@graphql/trial/trial.keys';
import { useContext, useState } from 'react';
import {
  ControllerRenderProps,
  FieldValues,
  useFormContext,
} from 'react-hook-form';
import { z } from 'zod';

const FEEDBACK_ANSWERS = [
  {
    value: HasRepliedSatisfaction.Yes,
    labelKey: 'Service.Trials.XtmPlatform.Feedback.Yes',
  },
  {
    value: HasRepliedSatisfaction.No,
    labelKey: 'Service.Trials.XtmPlatform.Feedback.No',
  },
] as const;

const feedbackFormSchema = z.object({
  answer: z.enum(HasRepliedSatisfaction),
  justification: z.string().optional(),
});

type FeedbackFieldProps = {
  field: ControllerRenderProps<FieldValues, string>;
};

const AnswerFieldType = ({ field }: FeedbackFieldProps) => {
  const t = useTranslate();
  return (
    <FormItem>
      <FormControl>
        <RadioGroup
          orientation="horizontal"
          aria-label={t('Service.Trials.XtmPlatform.Feedback.Question')}
          onValueChange={field.onChange}
          value={field.value}>
          {FEEDBACK_ANSWERS.map(({ value, labelKey }) => (
            <Radio
              key={value}
              value={value}
              label={t(labelKey)}
            />
          ))}
        </RadioGroup>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
};

const JustificationFieldType = ({ field }: FeedbackFieldProps) => {
  const t = useTranslate();
  const { watch, getFieldState } = useFormContext();
  if (watch('answer') !== HasRepliedSatisfaction.No) return null;
  return (
    <Textarea
      label={t('Service.Trials.XtmPlatform.Feedback.Justification')}
      {...field}
      value={field.value ?? ''}
      error={getFieldState(field.name).error?.message}
    />
  );
};

export const PrivateXtmPlatformTrialBanner = () => {
  const { me } = useContext(PortalContext);
  const { settings } = useContext(SettingsContext);
  const organizationId = me?.selected_organization_id ?? '';
  const t = useTranslate();
  const [isFeedbackDialogDismissed, setIsFeedbackDialogDismissed] =
    useState(false);

  const variables: PlatformTrialStatusQueryVariables = { organizationId };

  const { data, isLoading, isPending, isError } = usePlatformTrialStatusQuery(
    portalGraphqlClient,
    variables,
    {
      enabled: !!organizationId,
      queryKey: platformTrialKeys.platformTrialStatus(variables),
    }
  );

  const { mutate: giveDeploymentFeedback } = useGiveDeploymentFeedbackMutation(
    portalGraphqlClient,
    {
      onError: () => {
        showSnackbar({
          severity: 'error',
          title: t('Utils.Error'),
        });
      },
    }
  );

  const platformTrialStatus = data?.platformTrialStatus;
  const { state, daysLeft } = deriveXtmPlatformTrialState({
    isBlacklisted: platformTrialStatus?.isBlacklisted ?? false,
    hubStatus: platformTrialStatus?.hub_status,
    endDate: platformTrialStatus?.end_date,
  });

  const shouldShowFeedbackDialog =
    me?.has_replied_satisfaction === null &&
    state !== 'none' &&
    state !== 'no-trial' &&
    daysLeft != null &&
    daysLeft >= 0 &&
    daysLeft <= 15;

  const isFeedbackDialogOpen =
    shouldShowFeedbackDialog && !isFeedbackDialogDismissed;

  if (!settings || !organizationId || isLoading || isPending || isError) {
    return null;
  }

  const handleSubmitFeedback = ({
    answer,
    justification,
  }: z.infer<typeof feedbackFormSchema>) => {
    const deploymentRequestId = platformTrialStatus?.deploymentRequestId;
    if (deploymentRequestId) {
      giveDeploymentFeedback({
        input: {
          deploymentRequestId,
          answer,
          justification:
            answer === HasRepliedSatisfaction.No && justification
              ? justification
              : null,
        },
      });
    }

    setIsFeedbackDialogDismissed(true);
  };

  return (
    <>
      <XtmPlatformTrialBanner
        state={state}
        daysLeft={daysLeft}
        learnMoreHref={`${settings.base_url_front}/${APP_PATH}/service/xtm-platform-trial`}
      />

      <Dialog
        open={isFeedbackDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleSubmitFeedback({ answer: HasRepliedSatisfaction.Closed });
          }
        }}>
        <DialogContent>
          <DialogTitle>
            {t('Service.Trials.XtmPlatform.Feedback.Question')}
          </DialogTitle>

          <DialogBody>
            <AutoForm
              formSchema={feedbackFormSchema}
              onSubmit={handleSubmitFeedback}
              fieldConfig={{
                answer: { fieldType: AnswerFieldType },
                justification: { fieldType: JustificationFieldType },
              }}>
              {({ isValid }) => (
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={!isValid}>
                    {t('Service.Trials.XtmPlatform.Feedback.Submit')}
                  </Button>
                </DialogFooter>
              )}
            </AutoForm>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
};
