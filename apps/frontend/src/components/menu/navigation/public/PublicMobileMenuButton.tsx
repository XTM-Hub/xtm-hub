'use client';

import PublicNavigation from '@/components/menu/navigation/public/PublicNavigation';
import { useTranslate } from '@/hooks/use-translate';
import { CloseIcon, MenuIcon } from '@filigran/icon';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@filigran/ui/clients';
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
      <SheetTrigger>
        <span className="sr-only">{t('Header.OpenMenu')}</span>
        <MenuIcon
          aria-hidden={true}
          focusable={false}
          className="h-6 w-6"
        />
      </SheetTrigger>
      <SheetContent
        side="left"
        className="bg-gradient-background">
        <SheetHeader className="flex flex-row justify-between pl-l bg-gradient-background border-elevation-border-strong">
          <div className="flex items-center gap-s">
            <Logo
              className="h-8 w-8"
              aria-hidden={true}
            />
            <SheetTitle>{t('Header.BrandName')}</SheetTitle>
          </div>
          <SheetClose>
            <CloseIcon
              aria-hidden={true}
              focusable={false}
              className="h-4 w-4 mr-xl"
            />
            <span className="sr-only">{t('Header.CloseMenu')}</span>
          </SheetClose>
        </SheetHeader>
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
