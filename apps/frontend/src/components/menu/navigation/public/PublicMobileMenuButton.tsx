'use client';

import PublicNavigation from '@/components/menu/navigation/public/PublicNavigation';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { MenuIcon } from '@filigran/icon';
import Logo from '@public/logo.svg';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface PublicMobileMenuButtonProps {
  visibleServiceSlugs: string[];
}

export const PublicMobileMenuButton = ({
  visibleServiceSlugs,
}: PublicMobileMenuButtonProps) => {
  const [open, setOpen] = useState(false);
  const currentPath = usePathname();
  const t = useTranslate();
  // Legitimate effect: close the menu on route change.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOpen(false), [currentPath]);

  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}>
      <SheetTrigger {...analyticsId('nav_mobile_menu_open')}>
        <span className="sr-only">{t('Header.OpenMenu')}</span>
        <MenuIcon
          aria-hidden={true}
          focusable={false}
          className="h-6 w-6"
        />
      </SheetTrigger>
      <SheetContent
        side="left"
        closeLabel={t('Header.CloseMenu')}
        className="bg-gradient-default">
        <SheetHeader className="flex flex-row pl-4 bg-gradient-default">
          <div className="flex items-center gap-2">
            <Logo
              className="h-8 w-8"
              aria-hidden={true}
            />
            <SheetTitle>{t('Header.BrandName')}</SheetTitle>
          </div>
        </SheetHeader>
        {/* eslint-disable-next-line no-restricted-syntax -- container whose children carry the IDs */}
        <div
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('a')) {
              setOpen(false);
            }
          }}>
          <PublicNavigation
            open={true}
            visibleServiceSlugs={visibleServiceSlugs}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};
