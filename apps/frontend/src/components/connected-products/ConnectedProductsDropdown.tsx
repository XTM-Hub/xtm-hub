'use client';

import { ConnectedProductItem } from '@/components/connected-products/ConnectedProductItem';
import { ConnectProductButton } from '@/components/connected-products/ConnectProductButton';
import { useConnectedPlatforms } from '@/components/connected-products/useConnectedPlatforms';
import { ArrowDropDownIcon } from '@filigran/icon';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@filigran/ui';
import { PlatformIdentifier } from '@graphql/generated';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

export const CONNECTABLE_PLATFORMS = [
  PlatformIdentifier.Opencti,
  PlatformIdentifier.Openaev,
];

export const ConnectedProductsDropdown = () => {
  const t = useTranslations();
  const { connectedPlatforms } = useConnectedPlatforms();

  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu
      open={open}
      onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="tertiary"
          className="flex flex-row items-center gap-xs text-primary font-medium">
          <span>
            {t('Header.ConnectedProducts.Count', {
              count: connectedPlatforms.length,
            })}
          </span>
          <ArrowDropDownIcon
            className={`h-5 w-5 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-0">
        {connectedPlatforms.length > 0 && (
          <>
            <div className="max-h-[70vh] overflow-y-auto overflow-x-hidden">
              {connectedPlatforms.map((platform, index) => (
                <div key={platform.id}>
                  <DropdownMenuItem className="p-0">
                    <ConnectedProductItem
                      platform={platform}
                      t={t}
                    />
                  </DropdownMenuItem>
                  {index < connectedPlatforms.length - 1 && (
                    <DropdownMenuSeparator className="bg-foreground/20" />
                  )}
                </div>
              ))}
            </div>
            <DropdownMenuSeparator className="bg-foreground/20" />
          </>
        )}
        <div className="flex flex-col gap-s p-m">
          <ConnectProductButton
            variant="tertiary"
            onCloseDropdown={() => setOpen(false)}
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
