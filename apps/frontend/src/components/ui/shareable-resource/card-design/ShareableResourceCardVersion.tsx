import { useBuildCompatibilityTranslationKey } from '@/hooks/use-build-compatibility-translation-key';
import { useRegisteredPlatforms } from '@/hooks/use-registered-platforms';
import { cn } from '@/lib/utils';
import { CheckIndeterminateIcon } from '@filigran/icon';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/ui/clients';
import { PlatformIdentifier } from '@graphql/generated';
import { useTranslations } from 'next-intl';

interface ShareableResourceCardVersionProps {
  requiredProductVersion?: string | null;
  product_version?: string | null;
  className?: string;
  /**
   * Whether this connector's product version is incompatible with the
   * currently selected OpenctiVersionFilter value. Combined with the
   * org's registered-platform compatibility check below into a single
   * tooltip, instead of stacking two separate tooltips on the same span.
   */
  isIncompatibleWithSelectedVersion?: boolean;
  filterIncompatibleTooltip?: string;
}

export const ShareableResourceCardVersion = ({
  requiredProductVersion,
  product_version,
  className,
  isIncompatibleWithSelectedVersion,
  filterIncompatibleTooltip,
}: ShareableResourceCardVersionProps) => {
  const t = useTranslations();
  const { platforms } = useRegisteredPlatforms(PlatformIdentifier.Opencti, {
    onlyActive: true,
  });
  const { platformToBeUpdated, incompatiblePlatformsCount } =
    useBuildCompatibilityTranslationKey({
      platforms,
      requiredProductVersion,
    });

  const isIncompatibleWithRegisteredPlatforms = incompatiblePlatformsCount > 0;

  if (
    !isIncompatibleWithSelectedVersion &&
    !isIncompatibleWithRegisteredPlatforms
  ) {
    return <span className={className}>{product_version}</span>;
  }

  const tooltipMessages = [
    isIncompatibleWithSelectedVersion ? filterIncompatibleTooltip : null,
    isIncompatibleWithRegisteredPlatforms
      ? t(`Service.Connectors.Incompatible`, {
          platformToBeUpdated,
          count: incompatiblePlatformsCount,
        })
      : null,
  ].filter((message): message is string => !!message);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            data-incompatible={isIncompatibleWithSelectedVersion || undefined}
            className={cn(
              'flex items-center gap-s data-[incompatible]:opacity-60',
              className
            )}>
            {product_version}
            {isIncompatibleWithRegisteredPlatforms && (
              <CheckIndeterminateIcon className="h-4 w-4" />
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {tooltipMessages.map((message) => (
            <div key={message}>{message}</div>
          ))}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
