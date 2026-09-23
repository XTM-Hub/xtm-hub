'use client';

import { CollapseMenuButton } from '@/components/menu/CollapseMenuButton';
import { useTranslate } from '@/hooks/use-translate';
import { LogoFiligranIcon } from '@filigran/icon';

interface PublicMenuFooterProps {
  open: boolean;
  handleOpenMenu: () => void;
}

export const MenuFooter = ({ open, handleOpenMenu }: PublicMenuFooterProps) => {
  const t = useTranslate();

  return (
    <div>
      <CollapseMenuButton
        open={open}
        handleOpenMenu={handleOpenMenu}
      />
      {open ? (
        <div className="flex items-center px-m pb-s gap-1 text-text-default-secondary text-[10px] whitespace-nowrap">
          {t('App.MadeBy')}
          <LogoFiligranIcon className="min-h-4 size-3 shrink-0" />
          {/* eslint-disable-next-line xtm-hub-i18n-rules/no-literal-string-in-jsx */}
          {'Filigran'}
        </div>
      ) : (
        <div className="flex justify-center pb-s text-text-default-secondary">
          <LogoFiligranIcon className="min-h-4 size-3" />
        </div>
      )}
    </div>
  );
};
