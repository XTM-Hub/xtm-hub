'use client';

import { ConnectedProductsDropdown } from '@/components/connected-products/ConnectedProductsDropdown';
import { LogoutMutation } from '@/components/logout.graphql';
import { PortalContext } from '@/components/me/AppPortalContext';
import PrivateNavigation from '@/components/menu/navigation/private/PrivateNavigation';
import HeaderOrganizationSwitcher from '@/components/menu/organization-switcher/HeaderOrganizationSwitcher';
import { NotificationButton } from '@/components/notification/NotificationButton';
import { DisplayLogo } from '@/components/ui/DisplayLogo';
import { IconActions, IconActionsItem } from '@/components/ui/IconActions';
import { Avatar } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { clearFiltersStorage } from '@/utils/filters-storage.utils';
import { APP_PATH } from '@/utils/path/constant';

import { useTranslate } from '@/hooks/use-translate';
import { MenuIcon } from '@filigran/icon';
import Link from 'next/link';

import { OrganizationCapability } from '@graphql/generated';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useContext, useEffect, useState } from 'react';
import { useMutation } from 'react-relay';

// Component interface
interface HeaderComponentProps {
  displayLogo?: boolean;
}

const HeaderComponent = ({ displayLogo }: HeaderComponentProps) => {
  const { me, hasOrganizationCapability } = useContext(PortalContext);
  const [open, setOpen] = useState(false);
  const currentPath = usePathname();
  const router = useRouter();
  const t = useTranslate();
  const queryClient = useQueryClient();
  const [commitLogoutMutation] = useMutation(LogoutMutation);

  // Legitimate effect: close the menu on route change.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOpen(false), [currentPath]);
  const canManageUser =
    hasOrganizationCapability &&
    (hasOrganizationCapability(
      OrganizationCapability.AdministrateOrganization
    ) ||
      hasOrganizationCapability(OrganizationCapability.ManageAccess));

  const handleLogout = useCallback(() => {
    commitLogoutMutation({
      variables: {},
      updater: (store) => {
        store.invalidateStore();
      },
      onCompleted() {
        // Logout/login navigate client-side (no full page reload), so the
        // React Query cache would otherwise survive a user switch in the
        // same browser tab and could serve stale, user-scoped data (e.g.
        // service capabilities) to whoever logs in next.
        queryClient.clear();
        clearFiltersStorage();
        router.push('/');
        router.refresh();
      },
    });
  }, [commitLogoutMutation, queryClient, router]);

  const headerContent = (
    <>
      <div className="mobile:hidden flex items-center gap-2">
        <DisplayLogo
          className={cn(
            'text-icon-highlight mr-2 h-full py-4',
            displayLogo ? '' : 'hidden'
          )}
        />
        <HeaderOrganizationSwitcher />
      </div>

      <DisplayLogo className="text-icon-highlight mr-2 h-full py-4 sm:hidden" />

      <div className="flex items-center gap-2">
        <div className="mobile:hidden flex items-center gap-2">
          <ConnectedProductsDropdown />
        </div>
        {canManageUser && <NotificationButton />}
        <div className="mobile:hidden flex items-center">
          <IconActions
            aria-label={t('MenuUser.ToggleUser')}
            icon={
              <div className="my-auto size-6">
                <Avatar src={me?.picture || undefined} />
              </div>
            }>
            <IconActionsItem asChild>
              <Link href={`/${APP_PATH}/profile`}>{t('MenuUser.Profile')}</Link>
            </IconActionsItem>
            <IconActionsItem onClick={handleLogout}>
              {t('LoginPage.Logout')}
            </IconActionsItem>
          </IconActions>
        </div>
        <div className="flex gap-1 items-center sm:hidden">
          <Sheet
            open={open}
            onOpenChange={setOpen}>
            <SheetTrigger>
              <span className="sr-only">
                {open ? t('Header.CloseMenu') : t('Header.OpenMenu')}
              </span>
              <MenuIcon
                aria-hidden={true}
                focusable={false}
                className="h-6 w-6"
              />
            </SheetTrigger>
            <SheetContent
              side="left"
              closeLabel={t('Header.CloseMenu')}
              className="bg-gradient-default">
              <SheetHeader className="flex flex-row justify-between pl-4 bg-gradient-default">
                <div className="flex items-center gap-2">
                  <DisplayLogo className="text-icon-highlight h-8" />
                  <SheetTitle className="sr-only">
                    {t('Header.BrandName')}
                  </SheetTitle>
                </div>
              </SheetHeader>
              <div className="flex flex-col h-full">
                <div>
                  <PrivateNavigation open={true} />
                  <Separator className="my-2" />
                  <div className="flex flex-col gap-3 pl-5">
                    <HeaderOrganizationSwitcher fitContainer />
                  </div>
                </div>
                <div className="mt-auto pt-4 pb-6 flex flex-col text-center">
                  <Link href={`/${APP_PATH}/profile`}>
                    <div className="w-full p-2 hover:bg-elevation-hover rounded">
                      {t('MenuUser.Profile')}
                    </div>
                  </Link>
                  <div
                    className="p-2 hover:bg-elevation-hover rounded cursor-pointer"
                    onClick={handleLogout}>
                    {t('LoginPage.Logout')}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </>
  );
  return headerContent;
};

// Component export
export default HeaderComponent;
