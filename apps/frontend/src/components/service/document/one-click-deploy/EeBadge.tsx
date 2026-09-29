import { useTranslate } from '@/hooks/use-translate';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/ui';

const EE_GRADIENT =
  'bg-[linear-gradient(90deg,#0FBCFF_-3.68%,#00F1BD_106.62%)]';

interface EeBadgeProps {
  onClick?: () => void;
}

const EeBadgeVisual = ({ interactive }: { interactive: boolean }) => {
  const t = useTranslate();
  return (
    <span
      className={cn(
        'flex h-4 w-4 items-center justify-center rounded-xs',
        'bg-slate-950',
        interactive && 'group-hover:bg-transparent',
        'text-[8px] font-bold leading-none'
      )}>
      <span className={cn(EE_GRADIENT, 'bg-clip-text text-transparent')}>
        {t('Service.ShareableResources.Deploy.EE.Tag')}
      </span>
    </span>
  );
};

const EeBadge = ({ onClick }: EeBadgeProps) => {
  const t = useTranslate();

  if (!onClick) {
    return (
      <span className={cn('inline-flex rounded-xs p-px', EE_GRADIENT)}>
        <EeBadgeVisual interactive={false} />
      </span>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipContent
          align="end"
          alignOffset={-9}
          sideOffset={9}
          className={cn(EE_GRADIENT)}>
          <div className="flex flex-col">
            <span className="font-medium">
              {t('Service.ShareableResources.Deploy.EE.HoverTitle')}
            </span>
            <span>
              {t('Service.ShareableResources.Deploy.EE.HoverSubtitle')}
            </span>
          </div>
        </TooltipContent>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            className={cn('group cursor-pointer rounded-xs p-px', EE_GRADIENT)}>
            <EeBadgeVisual interactive={true} />
          </button>
        </TooltipTrigger>
      </Tooltip>
    </TooltipProvider>
  );
};

export default EeBadge;
