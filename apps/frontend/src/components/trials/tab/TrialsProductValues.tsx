'use client';
import { TrialsExternalLink } from '@/components/trials/tab/TrialsExternalLink';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/ui';
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
    <div className="flex flex-col gap-xs">
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
                <span className="flex items-center gap-xs cursor-help">
                  <span className="text-text-default-secondary">
                    {product.platform_identifier?.toUpperCase()}
                  </span>
                  {asLink ? (
                    <TrialsExternalLink
                      url={value}
                      className="truncate"
                    />
                  ) : (
                    <span className="truncate">{value}</span>
                  )}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-md">{value}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
};
