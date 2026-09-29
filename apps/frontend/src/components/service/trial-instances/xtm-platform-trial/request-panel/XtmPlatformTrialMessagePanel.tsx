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
  <div className="flex h-full flex-col gap-l rounded p-l bg-elevation-background-layer-2 lg:min-h-[346px]">
    <div className="flex flex-1 flex-col items-center justify-center gap-xxl rounded border border-elevation-border-default-layer-1">
      <div className="flex flex-col gap-s text-center">
        <p className="heading-xs">{title}</p>
        <p className="content-body-base">{description}</p>
        {details}
      </div>
    </div>
    {actions && <div className="flex justify-end gap-s">{actions}</div>}
  </div>
);
