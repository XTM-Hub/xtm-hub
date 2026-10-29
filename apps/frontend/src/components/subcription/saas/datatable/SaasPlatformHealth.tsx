import { SLA_PERCENT_FORMAT } from '@/components/service/registration/sla-availability-chart.utils';
import {
  getHealthIssueRatio,
  STORAGE_PERCENT_FORMAT,
} from '@/components/subcription/saas/saas-list.utils';
import { useTranslate } from '@/hooks/use-translate';
import {
  Chip,
  type ChipSeverity,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@filigran/design-system';
import {
  SaasPlatformHealthIssue,
  type SaasPlatformRowFragment,
} from '@graphql/generated';
import { useFormatter } from 'next-intl';

const HEALTH_ISSUE_CHIPS = {
  [SaasPlatformHealthIssue.Availability]: {
    labelKey: 'CSMBoard.HealthSla',
    percentFormat: SLA_PERCENT_FORMAT,
    severity: 'critical',
  },
  [SaasPlatformHealthIssue.Database]: {
    labelKey: 'CSMBoard.HealthDatabase',
    percentFormat: STORAGE_PERCENT_FORMAT,
    severity: 'medium',
  },
  [SaasPlatformHealthIssue.FileStorage]: {
    labelKey: 'CSMBoard.HealthFileStorage',
    percentFormat: STORAGE_PERCENT_FORMAT,
    severity: 'medium',
  },
} satisfies Record<
  SaasPlatformHealthIssue,
  {
    labelKey: string;
    percentFormat: Intl.NumberFormatOptions;
    severity: ChipSeverity;
  }
>;

export const SaasPlatformHealth = ({
  platform,
}: {
  platform: Pick<
    SaasPlatformRowFragment,
    'health_issues' | 'sla_cmtd' | 'storage'
  >;
}) => {
  const t = useTranslate();
  const format = useFormatter();

  const getHealthIssueLabel = (issue: SaasPlatformHealthIssue) => {
    const ratio = getHealthIssueRatio(platform, issue);
    return t(HEALTH_ISSUE_CHIPS[issue].labelKey, {
      percent:
        ratio === null
          ? ''
          : format.number(ratio, HEALTH_ISSUE_CHIPS[issue].percentFormat),
    });
  };

  const issues = platform.health_issues;
  if (!issues) {
    return null;
  }
  const [firstIssue, ...otherIssues] = issues;
  if (!firstIssue) {
    return (
      <Chip
        label={t('CSMBoard.Healthy')}
        severity="low"
      />
    );
  }
  const firstIssueLabel = getHealthIssueLabel(firstIssue);
  const firstIssueSeverity = HEALTH_ISSUE_CHIPS[firstIssue].severity;
  if (otherIssues.length === 0) {
    return (
      <Chip
        label={firstIssueLabel}
        severity={firstIssueSeverity}
      />
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Chip
          label={`${firstIssueLabel} +${otherIssues.length}`}
          severity={firstIssueSeverity}
          tabIndex={0}
        />
      </TooltipTrigger>
      <TooltipContent>
        <span className="flex flex-col items-start gap-1">
          {otherIssues.map((issue) => (
            <Chip
              key={issue}
              label={getHealthIssueLabel(issue)}
              severity={HEALTH_ISSUE_CHIPS[issue].severity}
            />
          ))}
        </span>
      </TooltipContent>
    </Tooltip>
  );
};
