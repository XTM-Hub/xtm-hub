'use client';
import { useTranslate } from '@/hooks/use-translate';
import {
  Chip,
  type ChipSeverity,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/design-system';
import {
  DeploymentRequestHubStatus,
  TrialsProductFragment,
} from '@graphql/generated';

const SEVERITY_BY_HUB_STATUS: Record<DeploymentRequestHubStatus, ChipSeverity> =
  {
    [DeploymentRequestHubStatus.Active]: 'low',
    [DeploymentRequestHubStatus.Pending]: 'medium',
    [DeploymentRequestHubStatus.Provisioning]: 'medium',
    [DeploymentRequestHubStatus.Queued]: 'medium',
    [DeploymentRequestHubStatus.Cancelled]: 'neutral',
    [DeploymentRequestHubStatus.Expired]: 'neutral',
    [DeploymentRequestHubStatus.Failed]: 'neutral',
  };

interface TrialsProductsProps {
  products: readonly TrialsProductFragment[];
}

export const TrialsProducts = ({ products }: TrialsProductsProps) => {
  const t = useTranslate();

  if (products.length === 0) {
    return <span>-</span>;
  }

  return (
    <div className="flex flex-wrap gap-s">
      {products.map((product) => (
        <TooltipProvider
          key={product.id}
          delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Chip
                  label={product.platform_identifier?.toUpperCase() ?? ''}
                  severity={SEVERITY_BY_HUB_STATUS[product.hub_status]}
                />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {t(`TrialsDashboard.ProductStatus.${product.hub_status}`)}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
};
