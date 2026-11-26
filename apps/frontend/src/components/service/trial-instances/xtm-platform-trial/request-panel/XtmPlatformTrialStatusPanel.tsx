'use client';

import { XtmPlatformTrialRequestStepper } from '@/components/service/trial-instances/xtm-platform-trial/request-form/XtmPlatformTrialRequestStepper';
import { XtmPlatformTrialStatusPanelState } from '@/components/service/trial-instances/xtm-platform-trial/request-panel/xtm-platform-trial-panel.utils';
import { useTranslate } from '@/hooks/use-translate';
import { useDateFormatter } from '@/utils/date';
import { ReactNode } from 'react';

export type XtmPlatformTrialStatusPanelDateRowLabelKey =
  'RequestedOn' | 'StartedOn' | 'CancelledOn' | 'FinishedOn';

export interface XtmPlatformTrialStatusPanelDateRow {
  labelKey: XtmPlatformTrialStatusPanelDateRowLabelKey;
  date: string | null;
}

interface XtmPlatformTrialStatusPanelProps {
  state: XtmPlatformTrialStatusPanelState;
  requesterEmail: string;
  dateRows: XtmPlatformTrialStatusPanelDateRow[];
  stepIndex?: number;
  actions?: ReactNode;
}

export const XtmPlatformTrialStatusPanel = ({
  state,
  requesterEmail,
  dateRows,
  stepIndex,
  actions,
}: XtmPlatformTrialStatusPanelProps) => {
  const t = useTranslate();
  const formatDate = useDateFormatter();

  const renderDateRow = ({
    labelKey,
    date,
  }: XtmPlatformTrialStatusPanelDateRow) => (
    <span
      key={labelKey}
      className="whitespace-nowrap text-content-compact text-default-secondary">
      {t(`Service.Trials.XtmPlatform.Page.Status.${labelKey}`)}:{' '}
      <span className="text-default-primary">
        {formatDate(date, 'DATE_MEDIUM') ?? '-'}
      </span>
    </span>
  );

  const singleDateRow = dateRows.length === 1 ? dateRows[0] : undefined;

  return (
    <div className="flex w-full flex-col gap-6 rounded layer-2 bg-elevation-default p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center text-content-base">
            <span className="text-default-secondary">
              {t('Service.Trials.Form.AssociatedEmail')}
            </span>
            <span className="text-default-primary">{requesterEmail}</span>
          </div>
          {singleDateRow && renderDateRow(singleDateRow)}
        </div>
        {dateRows.length > 1 && (
          <div className="flex items-center justify-between gap-4">
            {dateRows.map(renderDateRow)}
          </div>
        )}
      </div>

      <div className="flex flex-col items-center justify-center gap-6 rounded border border-[var(--border-elevation-subtle-layer-3)] px-6 py-16 text-center">
        <div className="flex flex-col gap-1">
          <p className="title-xs">
            {t(`Service.Trials.XtmPlatform.Page.Status.${state}.Title`)}
          </p>
          <p className="content-base whitespace-pre-line">
            {t(`Service.Trials.XtmPlatform.Page.Status.${state}.Description`)}
          </p>
        </div>
        {stepIndex !== undefined ? (
          <XtmPlatformTrialRequestStepper currentStepIndex={stepIndex} />
        ) : null}
      </div>

      <div className="flex justify-end gap-2">{actions}</div>
    </div>
  );
};
