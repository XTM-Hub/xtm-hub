'use client';

import { CollapseMenuButton } from '@/components/menu/CollapseMenuButton';
import { EditTranslationsButton } from '@/components/menu/EditTranslationsButton';
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
          {/* eslint-disable-next-line xtm-hub-i18n-rules/no-literal-string-in-jsx */}
          {'Filigran'}
        </div>
      ) : (
        <div className="flex justify-center pb-2 text-icon-subtle">
          <LogoFiligranIcon
            aria-hidden={true}
            className="min-h-4 size-3"
          />
        </div>
      )}
    </div>
  );
};
