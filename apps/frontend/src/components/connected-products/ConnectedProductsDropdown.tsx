'use client';

import { ConnectedProductItem } from '@/components/connected-products/ConnectedProductItem';
import { ConnectProductButton } from '@/components/connected-products/ConnectProductButton';
import { useConnectedPlatforms } from '@/components/connected-products/useConnectedPlatforms';
import { useTranslate } from '@/hooks/use-translate';
import {
  Button,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from '@filigran/design-system';
import { ArrowDropDownIcon } from '@filigran/icon';
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

  return (
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
        <div className="flex flex-col gap-s p-m">
          <ConnectProductButton
            priority="tertiary"
            onCloseDropdown={() => setOpen(false)}
          />
        </div>
      </MenuContent>
    </Menu>
  );
};
