import { useTranslate } from '@/hooks/use-translate';
import { cn } from '@/lib/utils';
import { LeftPanelCloseIcon, LeftPanelOpenIcon } from '@filigran/icon';
import { Button } from '@filigran/ui';

interface CollapseMenuButtonProps {
  open: boolean;
  handleOpenMenu: () => void;
}

export const CollapseMenuButton = ({
  open,
  handleOpenMenu,
}: CollapseMenuButtonProps) => {
  const t = useTranslate();
  return (
    <div className="shrink-0 pb-s">
      <Button
        variant="tertiary"
        aria-label={t('App.CollapseSidebar')}
        className="h-9 px-m w-full justify-start rounded-none text-foreground"
        onClick={handleOpenMenu}>
        <span className="flex w-8 shrink-0 justify-center">
          <span className="relative h-6 w-6">
            <LeftPanelCloseIcon
              className={cn(
                'absolute h-6 w-6 p-1 transition-all duration-300 ease-in-out text-text-default-secondary',
                open ? 'rotate-0 opacity-100' : 'rotate-90 opacity-0'
              )}
            />
            <LeftPanelOpenIcon
              className={cn(
                'absolute h-6 w-6 p-1 transition-all duration-300 ease-in-out text-text-default-secondary',
                open ? '-rotate-90 opacity-0' : 'rotate-0 opacity-100'
              )}
            />
          </span>
        </span>
        <span
          className={cn(
            'normal-case text-text-default-primary',
            open ? 'ml-2' : 'sr-only'
          )}>
          {t('App.Collapse')}
        </span>
      </Button>
    </div>
  );
};
