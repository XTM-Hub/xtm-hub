'use client';

import { CollapseMenuButton } from '@/components/menu/CollapseMenuButton';
import { EditTranslationsButton } from '@/components/menu/EditTranslationsButton';
import { useTranslate } from '@/hooks/use-translate';
import { LogoFiligranIcon } from '@filigran/icon';

const BRAND_NAME = 'Filigran';

interface PublicMenuFooterProps {
  open: boolean;
  handleOpenMenu: () => void;
}

export const MenuFooter = ({ open, handleOpenMenu }: PublicMenuFooterProps) => {
  const t = useTranslate();

  return (
    <div>
      <EditTranslationsButton open={open} />
      <CollapseMenuButton
        open={open}
        handleOpenMenu={handleOpenMenu}
      />
      {open ? (
        <div className="flex items-center px-3 pb-2 gap-1 text-default-secondary text-[10px] whitespace-nowrap">
          {t('App.MadeBy')}
          <LogoFiligranIcon
            aria-hidden={true}
            className="min-h-4 size-3 shrink-0"
          />
          {BRAND_NAME}
        </div>
      ) : (
        <div className="flex justify-center pb-2 text-icon-subtle">
          <span className="sr-only">
            {t('App.MadeByBrand', { brand: BRAND_NAME })}
          </span>
          <LogoFiligranIcon
            aria-hidden={true}
            className="min-h-4 size-3"
          />
        </div>
      )}
    </div>
  );
};
