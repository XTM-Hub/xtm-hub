import { CountBadge } from '@/components/ui/CountBadge';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface XtmPlatformTrialRequestStepperProps {
  currentStepIndex: number;
}

const STEP_LABEL_KEYS = ['Pending', 'Provisioning', 'Active'];

export const XtmPlatformTrialRequestStepper = ({
  currentStepIndex,
}: XtmPlatformTrialRequestStepperProps) => {
  const t = useTranslations();

  return (
    <div className="flex items-start">
      {STEP_LABEL_KEYS.map((labelKey, index) => {
        const isCurrent = index === currentStepIndex;
        return (
          <div
            key={labelKey}
            className="flex items-start">
            <div className="flex flex-col items-center gap-xs">
              <CountBadge
                count={index + 1}
                fontClass="content-body-base-bold"
                bgFadedClass={
                  isCurrent
                    ? 'bg-feedback-success-secondary-transparency'
                    : 'bg-feedback-neutral-secondary-transparency'
                }
                textClass={
                  isCurrent
                    ? 'text-feedback-success-primary'
                    : 'text-feedback-neutral-primary'
                }
              />
              <span
                className={cn(
                  'content-body-base-bold',
                  isCurrent
                    ? 'text-feedback-success-primary'
                    : 'text-feedback-neutral-primary'
                )}>
                {t(
                  `Service.Trials.XtmPlatform.Page.Status.Stepper.${labelKey}`
                )}
              </span>
            </div>
            {index < STEP_LABEL_KEYS.length - 1 && (
              <div className="mx-s mt-3 h-[2px] w-[88.5px] bg-feedback-neutral-primary" />
            )}
          </div>
        );
      })}
    </div>
  );
};
