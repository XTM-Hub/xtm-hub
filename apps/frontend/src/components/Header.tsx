'use client';

import { ConnectedProductsDropdown } from '@/components/connected-products/ConnectedProductsDropdown';
import { LogoutMutation } from '@/components/logout.graphql';
import { PortalContext } from '@/components/me/AppPortalContext';
import PrivateNavigation from '@/components/menu/navigation/private/PrivateNavigation';
import HeaderOrganizationSwitcher from '@/components/menu/organization-switcher/HeaderOrganizationSwitcher';
import { NotificationButton } from '@/components/notification/NotificationButton';
import { DisplayLogo } from '@/components/ui/DisplayLogo';
import { IconActions, IconActionsItem } from '@/components/ui/IconActions';
import { cn } from '@/lib/utils';
import { APP_PATH } from '@/utils/path/constant';

import { MenuIcon } from '@filigran/icon';
import {
  Avatar,
  Separator,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@filigran/ui/clients';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations();
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
        router.push('/');
        router.refresh();
      },
    });
  }, [commitLogoutMutation, queryClient, router]);

  const headerContent = (
    <>
      <div className="mobile:hidden flex items-center gap-s">
        <DisplayLogo
          className={cn(
            'text-primary mr-2 h-full py-l',
            displayLogo ? '' : 'hidden'
          )}
        />
        <HeaderOrganizationSwitcher />
      </div>

      <DisplayLogo className="text-primary mr-2 h-full py-l sm:hidden" />

      <div className="flex items-center gap-s">
        <div className="mobile:hidden flex items-center gap-s">
          <ConnectedProductsDropdown />
        </div>
        {canManageUser && <NotificationButton />}
        <div className="mobile:hidden flex items-center">
          <IconActions
            className="rounded-full"
            icon={
              <>
                <div className="my-auto [&_img]:object-cover size-6 text-primary [&_span]:bg-transparent">
                  <Avatar src={me?.picture || undefined} />
                </div>
                <span className="sr-only">{t('MenuUser.ToggleUser')}</span>
              </>
            }>
            <IconActionsItem asChild>
              <Link href={`/${APP_PATH}/profile`}>{t('MenuUser.Profile')}</Link>
            </IconActionsItem>
            <IconActionsItem onClick={handleLogout}>
              {t('LoginPage.Logout')}
            </IconActionsItem>
          </IconActions>
        </div>
        <div className="flex gap-xs items-center sm:hidden">
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
              className="bg-gradient-background">
              <SheetHeader className="flex flex-row justify-between pl-l bg-gradient-background">
                <div className="flex items-center gap-s">
                  <DisplayLogo className="text-primary h-8" />
                  <SheetTitle className="sr-only">
                    {t('Header.BrandName')}
                  </SheetTitle>
                </div>
              </SheetHeader>
              <div className="flex flex-col h-full">
                <div>
                  <PrivateNavigation open={true} />
                  <Separator className="my-s" />
                  <div className="flex flex-col gap-m pl-5">
                    <HeaderOrganizationSwitcher fitContainer />
                  </div>
                </div>
                <div className="mt-auto pt-l pb-xl flex flex-col text-center">
                  <Link href={`/${APP_PATH}/profile`}>
                    <div className="w-full p-2 hover:bg-hover rounded">
                      {t('MenuUser.Profile')}
                    </div>
                  </Link>
                  <div
                    className="p-2 hover:bg-hover rounded cursor-pointer"
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
