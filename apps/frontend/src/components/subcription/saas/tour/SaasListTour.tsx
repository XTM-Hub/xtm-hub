'use client';

import {
  getSaasListTourSteps,
  SAAS_LIST_TOUR_TARGET,
  type SaasListTourStep,
  saasListTourTarget,
} from '@/components/subcription/saas/tour/saas-list-tour';
import { useTranslate } from '@/hooks/use-translate';
import { Button, Icon } from '@filigran/design-system';
import { type ProviderProps, TourProvider, useTour } from '@reactour/tour';
import { type ReactNode, useMemo } from 'react';

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

export const SaasListTourProvider = ({ children }: { children: ReactNode }) => {
  const t = useTranslate();
  const steps = useMemo(() => getSaasListTourSteps(t), [t]);

  return (
    <TourProvider
      steps={steps}
      styles={TOUR_STYLES}
      accessibilityOptions={{
        closeButtonAriaLabel: t('CSMBoard.Tour.Close'),
        showNavigationScreenReaders: true,
      }}>
      {children}
    </TourProvider>
  );
};

export const SaasListTourArea = ({ children }: { children: ReactNode }) => {
  const { isOpen, currentStep, steps } = useTour();
  const step = isOpen ? (steps as SaasListTourStep[])[currentStep] : undefined;

  return (
    <div
      {...saasListTourTarget(SAAS_LIST_TOUR_TARGET.List)}
      className={step?.listClassName}>
      {children}
    </div>
  );
};

export const SaasListTourButton = () => {
  const t = useTranslate();
  const { setIsOpen, setCurrentStep } = useTour();

  const startTour = () => {
    setCurrentStep(0);
    setIsOpen(true);
  };

  return (
    <Button
      {...saasListTourTarget(SAAS_LIST_TOUR_TARGET.Documentation)}
      priority="secondary"
      startIcon={
        <Icon
          name="book"
          size={16}
        />
      }
      onClick={startTour}>
      {t('CSMBoard.Tour.Documentation')}
    </Button>
  );
};
