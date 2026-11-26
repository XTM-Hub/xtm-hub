import { ReactNode } from 'react';

interface XtmPlatformTrialMessagePanelProps {
  title: string;
  description: string;
  details?: ReactNode;
  actions?: ReactNode;
}

export const XtmPlatformTrialMessagePanel = ({
  title,
  description,
  details,
  actions,
}: XtmPlatformTrialMessagePanelProps) => (
  <div className="flex h-full flex-col gap-4 rounded p-4 layer-2 bg-elevation-default lg:min-h-[346px]">
    <div className="flex flex-1 flex-col items-center justify-center gap-8 rounded border border-[var(--border-elevation-default-layer-1)]">
      <div className="flex flex-col gap-2 text-center">
        <p className="title-xs">{title}</p>
        <p className="content-base">{description}</p>
        {details}
      </div>
    </div>
    {actions && <div className="flex justify-end gap-2">{actions}</div>}
  </div>
);
