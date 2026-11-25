import {
  type AdminRegisteredPlatformRow,
  getPlatformProductName,
} from '@/components/admin/registered-platform/admin-registered-platforms.utils';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { Button } from '@filigran/design-system';
import { adminRegisteredPlatformsKeys } from '@graphql/admin-registered-platforms/admin-registered-platforms.keys';
import { useAdminUnregisterPlatformMutation } from '@graphql/generated';
import { registeredPlatformsKeys } from '@graphql/registered-platforms/registered-platforms.keys';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

interface AdminUnregisterPlatformProps {
  platform: Pick<
    AdminRegisteredPlatformRow,
    'service_instance_id' | 'title' | 'identifier' | 'organization'
  >;
}

export const AdminUnregisterPlatform = ({
  platform,
}: AdminUnregisterPlatformProps) => {
  const t = useTranslate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { mutate: unregisterPlatform, isPending } =
    useAdminUnregisterPlatformMutation(portalGraphqlClient, {
      onSuccess: async () => {
        setOpen(false);
        showSnackbar({
          severity: 'success',
          title: t('AdminRegisteredPlatforms.UnregisterSuccess', {
            title: platform.title,
          }),
        });
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: adminRegisteredPlatformsKeys.all(),
          }),
          // The admin may belong to the organization: its navigation lists the platforms it has registered.
          queryClient.invalidateQueries({
            queryKey: registeredPlatformsKeys.all(),
          }),
        ]);
      },
      onError: (error: unknown) => {
        const errorMessage =
          error instanceof Error ? error.message : 'UNKNOWN_ERROR';
        showSnackbar({
          severity: 'error',
          title: t('Utils.Error'),
          description: <>{t(`Error.Server.${errorMessage}`)}</>,
        });
      },
    });

  const productName = getPlatformProductName(platform.identifier);

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button
          variant="destructive"
          priority="tertiary"
          size="sm"
          {...analyticsId('admin_registered_platform_remove')}>
          {t('AdminRegisteredPlatforms.Unregister')}
        </Button>
      }
      confirmAnalyticsId="admin_registered_platform_removal_confirm"
      title={t('AdminRegisteredPlatforms.UnregisterDialog.Title', {
        title: platform.title,
      })}
      confirmLabel={t('AdminRegisteredPlatforms.Unregister')}
      destructive
      confirmDisabled={isPending}
      onConfirm={(event) => {
        // Keep the dialog open until the request succeeds: onSuccess closes it.
        event.preventDefault();
        unregisterPlatform({
          serviceInstanceId: platform.service_instance_id,
        });
      }}>
      {/* Without an owner organization, nobody is emailed: the API deactivates the registration all the same. */}
      {platform.organization
        ? t('AdminRegisteredPlatforms.UnregisterDialog.Text', {
            title: platform.title,
            product: productName,
            organization: platform.organization.name,
          })
        : t(
            'AdminRegisteredPlatforms.UnregisterDialog.TextWithoutOrganization',
            {
              title: platform.title,
              product: productName,
            }
          )}
    </ConfirmDialog>
  );
};
