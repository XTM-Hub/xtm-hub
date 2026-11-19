'use client';

import {
  getSaasListTourColumnIds,
  getSaasListTourSteps,
  SAAS_LIST_TOUR_TARGET,
  type SaasListTourStep,
  saasListTourTarget,
} from '@/components/subcription/saas/tour/saas-list-tour';
import {
  type AppTourAnalyticsIds,
  AppTourButton,
  AppTourProvider,
} from '@/components/tour/AppTour';
import { useDataTable } from '@/components/ui/data-table';
import { useTranslate } from '@/hooks/use-translate';
import { useTour } from '@reactour/tour';
import type { Table } from '@tanstack/react-table';
import { type ReactNode, useEffect, useMemo, useRef } from 'react';

const SAAS_LIST_TOUR_ANALYTICS_IDS: AppTourAnalyticsIds = {
  close: 'admin_saas_tour_close',
  previousStep: 'admin_saas_tour_previous_step_open',
  nextStep: 'admin_saas_tour_next_step_open',
};

export const SaasListTourProvider = ({ children }: { children: ReactNode }) => {
  const t = useTranslate();
  const steps = useMemo(() => getSaasListTourSteps(t), [t]);

  return (
    <AppTourProvider
      steps={steps}
      analyticsIds={SAAS_LIST_TOUR_ANALYTICS_IDS}>
      {children}
    </AppTourProvider>
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
  const showTourColumns = useShowTourColumns();

  return (
    <AppTourButton
      analyticsId="admin_saas_tour_open"
      {...saasListTourTarget(SAAS_LIST_TOUR_TARGET.Documentation)}
      onStart={showTourColumns}
    />
  );
};
