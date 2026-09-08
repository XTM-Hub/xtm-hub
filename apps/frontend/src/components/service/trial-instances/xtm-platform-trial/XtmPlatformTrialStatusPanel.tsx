'use client';

import { XtmPlatformTrialRequestStepper } from '@/components/service/trial-instances/xtm-platform-trial/XtmPlatformTrialRequestStepper';
import { XtmPlatformTrialStatusPanelState } from '@/components/service/trial-instances/xtm-platform-trial/xtm-platform-trial-panel.utils';
import { useDateFormatter } from '@/utils/date';
import { Checkbox } from '@filigran/ui';
import { PlatformIdentifier } from '@graphql/generated';
import { useTranslations } from 'next-intl';
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
  products: PlatformIdentifier[];
  stepIndex?: number;
  actions?: ReactNode;
}

export const XtmPlatformTrialStatusPanel = ({
  state,
  requesterEmail,
  dateRows,
  products,
  stepIndex,
  actions,
}: XtmPlatformTrialStatusPanelProps) => {
  const t = useTranslations();
  const formatDate = useDateFormatter();
  const isInProgress =
    state === XtmPlatformTrialStatusPanelState.RequestInProgress;

  const renderDateRow = ({
    labelKey,
    date,
  }: XtmPlatformTrialStatusPanelDateRow) => (
    <span
      key={labelKey}
      className="whitespace-nowrap text-content-body-compact text-text-default-secondary">
      {t(`Service.Trials.XtmPlatform.Page.Status.${labelKey}`)}:{' '}
      <span className="text-text-default-primary">
        {formatDate(date, 'DATE_MEDIUM') ?? '-'}
      </span>
    </span>
  );

  const singleDateRow = dateRows.length === 1 ? dateRows[0] : undefined;

  return (
    <div className="flex w-full flex-col gap-xl rounded bg-elevation-background-layer-2 p-xl">
      <div className="flex flex-col gap-s">
        <div className="flex items-center justify-between gap-l">
          <div className="flex items-center text-content-body-base">
            <span className="text-text-default-secondary">
              {t('Service.Trials.Form.AssociatedEmail')}
            </span>
            <span className="text-text-default-primary">{requesterEmail}</span>
          </div>
          {singleDateRow && renderDateRow(singleDateRow)}
        </div>
        {dateRows.length > 1 && (
          <div className="flex items-center justify-between gap-l">
            {dateRows.map(renderDateRow)}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-s rounded p-l bg-elevation-background-layer-3">
        <h3 className="heading-xs">
          {t(
            isInProgress
              ? 'Service.Trials.XtmPlatform.Page.Status.ProductsIncludedInRequest'
              : 'Service.Trials.XtmPlatform.Page.Status.ProductsIncluded'
          )}
        </h3>
        <div className="flex items-center gap-xl">
          {products.map((product) => (
            <div
              key={product}
              className="relative flex items-center gap-s text-text-default-disabled">
              <Checkbox
                id={`status-product-${product}`}
                className="text-text-default-primary"
                checked
                disabled
              />
              <label
                htmlFor={`status-product-${product}`}
                className="content-body-base">
                {t(`PlatformIdentifier.${product}`)}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-xl rounded border border-elevation-border-subtle-layer-3 px-xl py-1600 text-center">
        <div className="flex flex-col gap-xs">
          <p className="heading-xs">
            {t(`Service.Trials.XtmPlatform.Page.Status.${state}.Title`)}
          </p>
          <p className="content-body-base whitespace-pre-line">
            {t(`Service.Trials.XtmPlatform.Page.Status.${state}.Description`)}
          </p>
        </div>
        {stepIndex !== undefined ? (
          <XtmPlatformTrialRequestStepper currentStepIndex={stepIndex} />
        ) : null}
      </div>

      <div className="flex justify-end gap-s">{actions}</div>
    </div>
  );
};
