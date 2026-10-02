import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/ui/clients';
import { Badge } from '@filigran/ui/servers';

export type VersionBadgeStatus = 'neutral' | 'success' | 'warning' | 'error';

interface ShareableResourceCardVersionProps {
  version?: string | null;
  status?: VersionBadgeStatus;
  tooltip?: string;
}

// Badge wraps its content in a child forcing text-foreground, so the status
// colour has to be handed down explicitly for the version itself to take it.
const INHERIT_TEXT = '[&>div]:text-inherit';

const STATUS_CLASSNAME: Record<VersionBadgeStatus, string> = {
  neutral: '',
  success: `border-alert-success-primary text-alert-success-primary ${INHERIT_TEXT}`,
  warning: `border-alert-warning-primary text-alert-warning-primary ${INHERIT_TEXT}`,
  error: `border-alert-error-primary text-alert-error-primary ${INHERIT_TEXT}`,
};

export const ShareableResourceCardVersion = ({
  version,
  status = 'neutral',
  tooltip,
}: ShareableResourceCardVersionProps) => {
  if (!version) {
    return null;
  }

  const badge = (
    <Badge
      // Only a badge carrying a tooltip is focusable, so keyboard users can
      // reach the detail without adding an empty tab stop.
      tabIndex={tooltip ? 0 : undefined}
      className={cn('whitespace-nowrap', STATUS_CLASSNAME[status])}>
      {version}
    </Badge>
  );

  if (!tooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
