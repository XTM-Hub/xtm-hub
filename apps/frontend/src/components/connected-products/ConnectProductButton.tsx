'use client';

import { AddIcon } from '@filigran/icon';
import { useState } from 'react';

import ConnectProductFromHubModal, {
  ConnectProductOrigin,
} from '@/components/registration/registerFromHub/ConnectProductFromHubModal';
import { Button } from '@filigran/design-system';
import { useTranslations } from 'next-intl';

interface ConnectProductButtonProps {
  onCloseDropdown?: () => void;
  priority?: 'primary' | 'secondary' | 'tertiary';
}

export const ConnectProductButton = ({
  onCloseDropdown,
  priority = 'primary',
}: ConnectProductButtonProps) => {
  const t = useTranslations();

  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <>
      <Button
        priority={priority}
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
