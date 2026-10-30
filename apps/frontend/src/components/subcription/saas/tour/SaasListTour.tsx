'use client';

import {
  getSaasListTourColumnIds,
  getSaasListTourSteps,
  SAAS_LIST_TOUR_TARGET,
  type SaasListTourStep,
  saasListTourTarget,
} from '@/components/subcription/saas/tour/saas-list-tour';
import { useDataTable } from '@/components/ui/data-table';
import { useTranslate } from '@/hooks/use-translate';
import { cn } from '@/lib/utils';
import { Button, Icon } from '@filigran/design-system';
import {
  components,
  type ProviderProps,
  TourProvider,
  useTour,
} from '@reactour/tour';
import type { Table } from '@tanstack/react-table';
import { type ReactNode, useEffect, useMemo, useRef } from 'react';

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
};

// Reactour labels its previous and next buttons in English, with no option to change it: the tour renders its own,
// with the look and behavior of Reactour's, to give them a translated label.
const TourNavigationButton = ({
  kind,
  label,
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

export const SaasListTourProvider = ({ children }: { children: ReactNode }) => {
  const t = useTranslate();
  const steps = useMemo(
    () =>
      getSaasListTourSteps(t).map((step, index) => ({
        ...step,
        navDotAriaLabel: t('CSMBoard.Tour.GoToStep', { step: index + 1 }),
      })),
    [t]
  );

  return (
    <TourProvider
      steps={steps}
      styles={TOUR_STYLES}
      prevButton={(props) => (
        <TourNavigationButton
          {...props}
          kind="prev"
          label={t('CSMBoard.Tour.PreviousStep')}
        />
      )}
      nextButton={(props) => (
        <TourNavigationButton
          {...props}
          kind="next"
          label={t('CSMBoard.Tour.NextStep')}
        />
      )}
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

const setColumnsVisibility = (
  table: Table<unknown>,
  columnIds: string[],
  isVisible: boolean
) =>
  table.setColumnVisibility((visibility) => ({
    ...visibility,
    ...Object.fromEntries(columnIds.map((columnId) => [columnId, isVisible])),
  }));

// A hidden column leaves the steps that point at it without a target: the tour shows the columns of its steps
// while it is open, then hides again the ones the user had hidden.
const useShowTourColumns = () => {
  const table = useDataTable<unknown>();
  const { isOpen, steps } = useTour();
  const shownColumnIds = useRef<string[]>([]);

  useEffect(() => {
    if (!isOpen && shownColumnIds.current.length > 0) {
      setColumnsVisibility(table, shownColumnIds.current, false);
      shownColumnIds.current = [];
    }
  }, [isOpen, table]);

  return () => {
    shownColumnIds.current = getSaasListTourColumnIds(
      steps as SaasListTourStep[]
    ).filter((columnId) => !table.getColumn(columnId)?.getIsVisible());
    setColumnsVisibility(table, shownColumnIds.current, true);
  };
};

export const SaasListTourButton = () => {
  const t = useTranslate();
  const { setIsOpen, setCurrentStep } = useTour();
  const showTourColumns = useShowTourColumns();

  const startTour = () => {
    showTourColumns();
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
