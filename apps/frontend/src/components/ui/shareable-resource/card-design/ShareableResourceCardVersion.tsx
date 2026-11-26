import {
  Chip,
  ChipSeverity,
  Icon,
  IconName,
  Text,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/design-system';

export type VersionBadgeStatus = 'neutral' | 'success' | 'warning' | 'error';

interface ShareableResourceCardVersionProps {
  version?: string | null;
  status?: VersionBadgeStatus;
  tooltip?: string;
}

interface StatusStyle {
  severity: ChipSeverity;
  icon: IconName | null;
}

const STATUS: Record<VersionBadgeStatus, StatusStyle> = {
  neutral: { severity: 'info', icon: null },
  success: { severity: 'low', icon: 'circle-check' },
  warning: { severity: 'high', icon: 'circle-alert' },
  error: { severity: 'critical', icon: 'circle-x' },
};

export const ShareableResourceCardVersion = ({
  version,
  status = 'neutral',
  tooltip,
}: ShareableResourceCardVersionProps) => {
  if (!version) {
    return null;
  }

  const { severity, icon } = STATUS[status];

  const chip = (
    <Chip
      // Only a chip carrying a tooltip is focusable, so keyboard users can
      // reach the detail without adding an empty tab stop.
      tabIndex={tooltip ? 0 : undefined}
      label={`V.${version}`}
      severity={severity}
      startIcon={
        icon ? (
          <Icon
            name={icon}
            size={16}
          />
        ) : undefined
      }
      className="min-w-0"
    />
  );

  if (!tooltip) {
    return chip;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{chip}</TooltipTrigger>
        <TooltipContent>
          <Text
            variant="content-compact"
            className="text-default-primary">
            {tooltip}
          </Text>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
