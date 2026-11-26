import { getContractDaysLeft } from '@/components/subcription/saas/saas-list.utils';
import { useTranslate } from '@/hooks/use-translate';
import { cn } from '@/lib/utils';
import { useDateFormatter } from '@/utils/date';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@filigran/design-system';
import { SaasPlatformContractStatus } from '@graphql/generated';

const CONTRACT_STATUS_CLASS: Record<SaasPlatformContractStatus, string> = {
  [SaasPlatformContractStatus.Active]: 'text-default-secondary',
  [SaasPlatformContractStatus.EndingSoon]: 'text-feedback-warning-primary',
  [SaasPlatformContractStatus.Ended]: 'text-feedback-error-primary',
};

export const SaasContractEnd = ({
  endDate,
  contractStatus,
}: {
  endDate: Date | string;
  contractStatus: SaasPlatformContractStatus | null | undefined;
}) => {
  const t = useTranslate();
  const formatDate = useDateFormatter();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'truncate',
            contractStatus && CONTRACT_STATUS_CLASS[contractStatus]
          )}
          tabIndex={0}>
          {contractStatus === SaasPlatformContractStatus.Ended
            ? t('CSMBoard.ContractEnded')
            : t('CSMBoard.EndsIn', {
                days: getContractDaysLeft(endDate),
              })}
        </span>
      </TooltipTrigger>
      <TooltipContent>{formatDate(endDate, 'DATE_MEDIUM')}</TooltipContent>
    </Tooltip>
  );
};
