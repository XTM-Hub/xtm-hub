'use client';
import { MenuFooter } from '@/components/menu/MenuFooter';
import { MenuLogo } from '@/components/menu/MenuLogo';
import PublicNavigation from '@/components/menu/navigation/public/PublicNavigation';
import { cn } from '@/lib/utils';
import { useLocale } from 'next-intl';
import { useCallback } from 'react';
import { useLocalStorage } from 'usehooks-ts';

interface PublicMenuProps {
  visibleServiceSlugs: string[];
  isXtmPlatformTrialEnabled: boolean;
}

const PublicMenu = ({
  visibleServiceSlugs,
  isXtmPlatformTrialEnabled,
}: PublicMenuProps) => {
  const locale = useLocale();
  const [open, setOpen] = useLocalStorage<boolean>(
    'is-public-menu-open',
    true,
    { initializeWithValue: false }
  );
  const handleOpenMenu = useCallback(() => setOpen((prev) => !prev), [setOpen]);

  return (
    <aside
      className={cn(
        'max-md:hidden z-20 sticky shrink-0 top-0 left-0 flex h-full flex-col overflow-y-auto overflow-x-hidden bg-gradient-layer-0-white duration-300 ease-in-out',
        open ? 'w-48' : 'w-14'
      )}>
      <MenuLogo href={`/${locale}`} />
      <div className="flex flex-col flex-1 justify-between min-h-0">
        <PublicNavigation
          open={open}
          visibleServiceSlugs={visibleServiceSlugs}
          isXtmPlatformTrialEnabled={isXtmPlatformTrialEnabled}
        />
        <MenuFooter
          open={open}
          handleOpenMenu={handleOpenMenu}
        />
      </div>
    </aside>
  );
};

export default PublicMenu;
