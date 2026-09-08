'use client';

import { AddIcon } from '@filigran/icon';
import { Button } from '@filigran/ui';
import { useState } from 'react';

import ConnectProductFromHubModal, {
  ConnectProductOrigin,
} from '@/components/registration/registerFromHub/ConnectProductFromHubModal';
import { useTranslations } from 'next-intl';

interface ConnectProductButtonProps {
  onCloseDropdown?: () => void;
  variant?: 'default' | 'secondary' | 'tertiary';
}

export const ConnectProductButton = ({
  onCloseDropdown,
  variant = 'default',
}: ConnectProductButtonProps) => {
  const t = useTranslations();

  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <>
      <Button
        variant={variant}
        className="gap-s"
        onClick={() => {
          setIsOpen(true);
        }}>
        <span>
          {t('Header.ConnectedProducts.ConnectPlatform', {
            platformName: 'product',
          })}
        </span>
        <AddIcon className="h-3 w-3" />
      </Button>
      <ConnectProductFromHubModal
        isOpen={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            onCloseDropdown?.();
          }
        }}
        origin={ConnectProductOrigin.homepage}
      />
    </>
  );
};
