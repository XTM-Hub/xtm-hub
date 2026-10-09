'use client';

import { ConnectedProductItem } from '@/components/connected-products/ConnectedProductItem';
import { useConnectedPlatforms } from '@/components/connected-products/useConnectedPlatforms';
import ConnectProductFromHubModal, {
  ConnectProductOrigin,
} from '@/components/registration/registerFromHub/ConnectProductFromHubModal';
import { useTranslate } from '@/hooks/use-translate';
import {
  Button,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from '@filigran/design-system';
import { AddIcon, ArrowDropDownIcon } from '@filigran/icon';
import { PlatformIdentifier } from '@graphql/generated';
import { useState } from 'react';

export const CONNECTABLE_PLATFORMS = [
  PlatformIdentifier.Opencti,
  PlatformIdentifier.Openaev,
];

export const ConnectedProductsDropdown = () => {
  const t = useTranslate();
  const { connectedPlatforms } = useConnectedPlatforms();

  const [open, setOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  return (
    <>
      <Menu
        open={open}
        onOpenChange={setOpen}>
        <MenuTrigger asChild>
          <Button
            priority="tertiary"
            className="font-medium"
            endIcon={
              <ArrowDropDownIcon
                className={`h-5 w-5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
              />
            }>
            {t('Header.ConnectedProducts.Count', {
              count: connectedPlatforms.length,
            })}
          </Button>
        </MenuTrigger>
        <MenuContent>
          {connectedPlatforms.length > 0 && (
            <>
              <div className="max-h-[70vh] overflow-y-auto overflow-x-hidden">
                {connectedPlatforms.map((platform, index) => (
                  <div key={platform.id}>
                    <MenuItem>
                      <ConnectedProductItem
                        platform={platform}
                        t={t}
                      />
                    </MenuItem>
                    {index < connectedPlatforms.length - 1 && <MenuSeparator />}
                  </div>
                ))}
              </div>
              <MenuSeparator />
            </>
          )}
          <MenuItem
            startIcon={<AddIcon className="h-4 w-4" />}
            onSelect={() => setIsConnectModalOpen(true)}>
            {t('Header.ConnectedProducts.ConnectPlatform', {
              platformName: 'product',
            })}
          </MenuItem>
        </MenuContent>
      </Menu>
      {/* Outside the menu content, which unmounts when the item closes the menu */}
      <ConnectProductFromHubModal
        isOpen={isConnectModalOpen}
        onOpenChange={setIsConnectModalOpen}
        origin={ConnectProductOrigin.homepage}
      />
    </>
  );
};
