'use client';

import { PortalContext } from '@/components/me/AppPortalContext';
import { XtmPlatformTrialBanner } from '@/components/service/trial-instances/banner/xtm-platform-trial/XtmPlatformTrialBanner';
import { deriveXtmPlatformTrialState } from '@/components/service/trial-instances/banner/xtm-platform-trial/xtm-platform-trial-banner.utils';
import { SettingsContext } from '@/components/settings/EnvPortalContext';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { APP_PATH } from '@/utils/path/constant';
import {
  AutoForm,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
  RadioGroup,
  RadioGroupItem,
  Textarea,
} from '@filigran/ui';
import { toast } from '@filigran/ui/clients';
import {
  HasRepliedSatisfaction,
  PlatformTrialStatusQueryVariables,
  useGiveDeploymentFeedbackMutation,
  usePlatformTrialStatusQuery,
} from '@graphql/generated';
import { platformTrialKeys } from '@graphql/trial/trial.keys';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations();
  return (
    <FormItem>
      <FormControl>
        <RadioGroup
          onValueChange={field.onChange}
          value={field.value}
          className="flex flex-row">
          {FEEDBACK_ANSWERS.map(({ value, labelKey }) => (
            <FormItem
              key={value}
              className="flex flex-row items-center">
              <FormControl>
                <RadioGroupItem value={value} />
              </FormControl>
              <FormLabel className="cursor-pointer font-normal">
                {t(labelKey)}
              </FormLabel>
            </FormItem>
          ))}
        </RadioGroup>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
};

const JustificationFieldType = ({ field }: FeedbackFieldProps) => {
  const t = useTranslations();
  const { watch } = useFormContext();
  if (watch('answer') !== HasRepliedSatisfaction.No) return null;
  return (
    <FormItem>
      <FormLabel>
        {t('Service.Trials.XtmPlatform.Feedback.Justification')}
      </FormLabel>
      <FormControl>
        <Textarea
          {...field}
          value={field.value ?? ''}
          className="min-h-24 bg-elevation-background-layer-1"
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  );
};

export const PrivateXtmPlatformTrialBanner = () => {
  const { me } = useContext(PortalContext);
  const { settings } = useContext(SettingsContext);
  const organizationId = me?.selected_organization_id ?? '';
  const t = useTranslations();
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
        toast({
          variant: 'destructive',
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
          <DialogHeader>
            <DialogTitle>
              {t('Service.Trials.XtmPlatform.Feedback.Question')}
            </DialogTitle>
          </DialogHeader>

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
        </DialogContent>
      </Dialog>
    </>
  );
};
