'use client';

import { AddIcon } from '@filigran/icon';
import { useState } from 'react';

import ConnectProductFromHubModal, {
  ConnectProductOrigin,
} from '@/components/registration/registerFromHub/ConnectProductFromHubModal';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { Button } from '@filigran/design-system';

export const ConnectProductButton = () => {
  const t = useTranslate();

  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <>
      <Button
        {...analyticsId('platform_connection_open')}
        priority="primary"
        endIcon={<AddIcon className="h-3 w-3" />}
        onClick={() => {
          setIsOpen(true);
        }}>
        {t('Header.ConnectedProducts.ConnectProduct')}
      </Button>
      <ConnectProductFromHubModal
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        origin={ConnectProductOrigin.homepage}
      />
    </>
  );
};
