'use client';

import { AddIcon } from '@filigran/icon';
import { useState } from 'react';

import ConnectProductFromHubModal, {
  ConnectProductOrigin,
} from '@/components/registration/registerFromHub/ConnectProductFromHubModal';
import { useTranslate } from '@/hooks/use-translate';
import { Button } from '@filigran/design-system';

interface ConnectProductButtonProps {
  onCloseDropdown?: () => void;
  priority?: 'primary' | 'secondary' | 'tertiary';
}

export const ConnectProductButton = ({
  onCloseDropdown,
  priority = 'primary',
}: ConnectProductButtonProps) => {
  const t = useTranslate();

  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <>
      <Button
        priority={priority}
        endIcon={<AddIcon className="h-3 w-3" />}
        onClick={() => {
          setIsOpen(true);
        }}>
        {t('Header.ConnectedProducts.ConnectPlatform', {
          platformName: 'product',
        })}
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
