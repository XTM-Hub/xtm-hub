import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/design-system';
import { ReactNode } from 'react';

interface DisabledActionTooltipProps {
  reason: ReactNode;
  children: ReactNode;
}

export const DisabledActionTooltip = ({
  reason,
  children,
}: DisabledActionTooltipProps) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        {/* A disabled control gets no focus or hover, so the wrapper carries the tooltip. */}
        <span
          tabIndex={0}
          className="inline-flex">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);
