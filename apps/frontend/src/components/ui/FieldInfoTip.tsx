import {
  Icon,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/design-system';
import { ReactNode } from 'react';

interface FieldInfoTipProps {
  /** Accessible name of the trigger, e.g. "About Scope". */
  label: string;
  /** What the field is, an example, and what it changes. */
  children: ReactNode;
}

/**
 * The info bubble next to a field label: pass it as the `infoTooltip` of a
 * design-system field or of `SelectField`.
 */
export const FieldInfoTip = ({ label, children }: FieldInfoTipProps) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        {/* eslint-disable-next-line no-restricted-syntax -- only opens a tooltip, not an action worth tracking */}
        <button
          type="button"
          aria-label={label}
          className="inline-flex text-default-secondary">
          <Icon
            name="info"
            size={16}
            aria-hidden
          />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{children}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);
