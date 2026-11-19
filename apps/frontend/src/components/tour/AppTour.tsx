'use client';

import { useTranslate } from '@/hooks/use-translate';
import {
  type AnalyticsElementId,
  analyticsId,
} from '@/lib/analytics/analytics.ids';
import { cn } from '@/lib/utils';
import { Button, Icon } from '@filigran/design-system';
import {
  components,
  type ProviderProps,
  type StepType,
  TourProvider,
  useTour,
} from '@reactour/tour';
import { type ComponentProps, type ReactNode, useEffect, useMemo } from 'react';

// The tour renders its own popover: it takes the design system's tokens so it follows the theme.
const TOUR_STYLES: ProviderProps['styles'] = {
  popover: (base) => ({
    ...base,
    backgroundColor: 'var(--bg-elevation-default-layer-1)',
    color: 'var(--text-default-primary)',
    borderRadius: 'var(--radius-md)',
    // The accent of the tour's badge and step dots, which sit in the popover.
    ['--reactour-accent' as string]: 'var(--color-filigran-brand-primary)',
  }),
  dot: (base, state) =>
    state?.current
      ? base
      : {
          ...base,
          color: 'var(--icon-subtle)',
          borderColor: 'var(--icon-subtle)',
        },
  arrow: (base, state) => ({
    ...base,
    color: state?.disabled ? 'var(--icon-disabled)' : 'var(--icon-default)',
  }),
};

type TourNavigationButtonProps = Parameters<
  NonNullable<ProviderProps['nextButton']>
>[0] & {
  kind: 'prev' | 'next';
  label: string;
  analyticsId: AnalyticsElementId;
};

// Reactour labels its previous and next buttons in English, with no option to change it: the tour renders its own,
// with the look and behavior of Reactour's, to give them a translated label.
const TourNavigationButton = ({
  kind,
  label,
  analyticsId: elementId,
  currentStep,
  stepsLength,
  setCurrentStep,
}: TourNavigationButtonProps) => {
  const isDisabled =
    kind === 'next' ? currentStep === stepsLength - 1 : currentStep === 0;

  const goToStep = () =>
    setCurrentStep(
      kind === 'next'
        ? Math.min(currentStep + 1, stepsLength - 1)
        : Math.max(currentStep - 1, 0)
    );

  return (
    <button
      {...analyticsId(elementId)}
      type="button"
      aria-label={label}
      disabled={isDisabled}
      className={cn(
        'block',
        isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
      )}
      onClick={goToStep}>
      <components.Arrow
        styles={TOUR_STYLES}
        inverted={kind === 'next'}
        disabled={isDisabled}
      />
    </button>
  );
};

// Reactour reads its `steps` prop on the first render only: steps built from data that loads afterwards would never
// reach the tour. This hands it each new version of the steps.
const SyncTourSteps = ({ steps }: { steps: StepType[] }) => {
  const { setSteps } = useTour();

  useEffect(() => {
    setSteps?.(steps);
  }, [steps, setSteps]);

  return null;
};

export interface AppTourAnalyticsIds {
  close: AnalyticsElementId;
  previousStep: AnalyticsElementId;
  nextStep: AnalyticsElementId;
}

interface AppTourProviderProps {
  steps: StepType[];
  analyticsIds: AppTourAnalyticsIds;
  children: ReactNode;
}

export const AppTourProvider = ({
  steps,
  analyticsIds,
  children,
}: AppTourProviderProps) => {
  const t = useTranslate();
  const labelledSteps = useMemo(
    () =>
      steps.map((step, index) => ({
        ...step,
        navDotAriaLabel: t('Tour.GoToStep', { step: index + 1 }),
      })),
    [steps, t]
  );
  const tourComponents = useMemo<ProviderProps['components']>(
    () => ({
      Close: (props: ComponentProps<typeof components.Close>) => (
        <components.Close
          {...props}
          {...analyticsId(analyticsIds.close)}
        />
      ),
    }),
    [analyticsIds.close]
  );

  return (
    <TourProvider
      steps={labelledSteps}
      styles={TOUR_STYLES}
      components={tourComponents}
      prevButton={(props) => (
        <TourNavigationButton
          {...props}
          kind="prev"
          analyticsId={analyticsIds.previousStep}
          label={t('Tour.PreviousStep')}
        />
      )}
      nextButton={(props) => (
        <TourNavigationButton
          {...props}
          kind="next"
          analyticsId={analyticsIds.nextStep}
          label={t('Tour.NextStep')}
        />
      )}
      accessibilityOptions={{
        closeButtonAriaLabel: t('Tour.Close'),
        showNavigationScreenReaders: true,
      }}>
      <SyncTourSteps steps={labelledSteps} />
      {children}
    </TourProvider>
  );
};

interface AppTourButtonProps {
  analyticsId: AnalyticsElementId;
  // Runs before the tour opens, to show what its steps point at.
  onStart?: () => void;
  // The `data-tour` attribute, when a step points at the button itself.
  'data-tour'?: string;
}

export const AppTourButton = ({
  analyticsId: elementId,
  onStart,
  'data-tour': dataTour,
}: AppTourButtonProps) => {
  const t = useTranslate();
  const { setIsOpen, setCurrentStep } = useTour();

  const startTour = () => {
    onStart?.();
    setCurrentStep(0);
    setIsOpen(true);
  };

  return (
    <Button
      {...analyticsId(elementId)}
      data-tour={dataTour}
      priority="secondary"
      startIcon={
        <Icon
          name="book"
          size={16}
        />
      }
      onClick={startTour}>
      {t('Tour.GuidedTour')}
    </Button>
  );
};
