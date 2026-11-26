import { CountBadge } from '@/components/ui/CountBadge';
import { useTranslate } from '@/hooks/use-translate';
import { cn } from '@/lib/utils';

interface XtmPlatformTrialRequestStepperProps {
  currentStepIndex: number;
}

const STEP_LABEL_KEYS = ['Pending', 'Provisioning', 'Active'];

export const XtmPlatformTrialRequestStepper = ({
  currentStepIndex,
}: XtmPlatformTrialRequestStepperProps) => {
  const t = useTranslate();

  return (
    <div className="flex items-start">
      {STEP_LABEL_KEYS.map((labelKey, index) => {
        const isCurrent = index === currentStepIndex;
        return (
          <div
            key={labelKey}
            className="flex items-start">
            <div className="flex flex-col items-center gap-1">
              <CountBadge
                count={index + 1}
                fontClass="content-base-bold"
                bgFadedClass={
                  isCurrent
                    ? 'bg-feedback-success-secondary-transparency-30'
                    : 'bg-feedback-neutral-secondary-transparency-30'
                }
                textClass={
                  isCurrent
                    ? 'text-feedback-success-primary'
                    : 'text-feedback-neutral-primary'
                }
              />
              <span
                className={cn(
                  'content-base-bold',
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
              <div className="mx-2 mt-3 h-[2px] w-[88.5px] bg-feedback-neutral-primary" />
            )}
          </div>
        );
      })}
    </div>
  );
};
