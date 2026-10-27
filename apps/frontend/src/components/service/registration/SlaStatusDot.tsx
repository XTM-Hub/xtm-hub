import {
  SLA_STATUS_CLASS,
  SlaStatus,
} from '@/components/service/registration/sla-availability-chart.utils';
import { cn } from '@/lib/utils';

interface SlaStatusDotProps {
  status: SlaStatus;
}

export const SlaStatusDot = ({ status }: SlaStatusDotProps) => (
  <span
    aria-hidden="true"
    className={cn('size-2 shrink-0 rounded-full', SLA_STATUS_CLASS[status])}
  />
);
