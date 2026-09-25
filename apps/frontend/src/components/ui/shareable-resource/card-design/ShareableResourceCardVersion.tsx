import { useBuildCompatibilityTranslationKey } from '@/hooks/use-build-compatibility-translation-key';
import { useRegisteredPlatforms } from '@/hooks/use-registered-platforms';
import { useTranslate } from '@/hooks/use-translate';
import { cn } from '@/lib/utils';
import { CheckIndeterminateIcon } from '@filigran/icon';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/ui/clients';
import { PlatformIdentifier } from '@graphql/generated';

interface ShareableResourceCardVersionProps {
  requiredProductVersion?: string | null;
  product_version?: string | null;
  className?: string;
}

export const ShareableResourceCardVersion = ({
  requiredProductVersion,
  product_version,
  className,
}: ShareableResourceCardVersionProps) => {
  const t = useTranslate();
  const { platforms } = useRegisteredPlatforms(PlatformIdentifier.Opencti, {
    onlyActive: true,
  });
  const { platformToBeUpdated, incompatiblePlatformsCount } =
    useBuildCompatibilityTranslationKey({
      platforms,
      requiredProductVersion,
    });

  if (incompatiblePlatformsCount > 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn('flex items-center gap-s', className)}>
              {product_version}
              <CheckIndeterminateIcon className="h-4 w-4" />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {t(`Service.Connectors.Incompatible`, {
              platformToBeUpdated,
              count: incompatiblePlatformsCount,
            })}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return <span className={className}>{product_version}</span>;
};
