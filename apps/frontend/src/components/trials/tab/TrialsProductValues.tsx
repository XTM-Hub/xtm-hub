'use client';
import { ExternalLink } from '@/components/ExternalLink';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/design-system';
import { TrialsProductFragment } from '@graphql/generated';

interface TrialsProductValuesProps {
  products: readonly TrialsProductFragment[];
  valueOf: (product: TrialsProductFragment) => string | null | undefined;
  asLink?: boolean;
}

export const TrialsProductValues = ({
  products,
  valueOf,
  asLink = false,
}: TrialsProductValuesProps) => {
  const valuedProducts = products.filter((product) => !!valueOf(product));

  if (valuedProducts.length === 0) {
    return <span>-</span>;
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      {valuedProducts.map((product) => {
        const value = valueOf(product);
        if (!value) {
          return null;
        }
        return (
          <TooltipProvider
            key={product.id}
            delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1 cursor-help">
                  <span className="text-default-secondary">
                    {product.platform_identifier?.toUpperCase()}
                  </span>
                  {asLink ? (
                    <ExternalLink
                      url={value}
                      analyticsId="admin_trial_platform_open"
                      className="truncate"
                    />
                  ) : (
                    <span className="truncate">{value}</span>
                  )}
                </span>
              </TooltipTrigger>
              <TooltipContent>{value}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
};
