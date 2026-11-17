import GuardCapacityComponent from '@/components/AdminGuard';
import { invalidatePrivateNavigationQueries } from '@/components/menu/navigation/private/private-navigation-query-invalidation';
import {
  PlatformMetadataMapping,
  ServiceDefinitionIdentifierToPlatformIdentifier,
} from '@/components/registration/PlatformIdentifierMapping';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { Button } from '@filigran/design-system';
import {
  OrganizationCapability,
  PlatformContract,
  PlatformIdentifier,
  RegisteredPlatformDetailsFragment,
  ServiceDefinitionIdentifier,
  useUnregisterPlatformMutation,
} from '@graphql/generated';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

interface UnregisterButtonProps {
  platform: RegisteredPlatformDetailsFragment;
}

export const UnregisterButton = ({ platform }: UnregisterButtonProps) => {
  const t = useTranslate();
  const router = useRouter();
  const queryClient = useQueryClient();

  const isTrial = platform.contract === PlatformContract.Trial;

  const { mutate: commitUnregisterPlatform } =
    useUnregisterPlatformMutation(portalGraphqlClient);

  const unregisterPlatform = () => {
    const identifier =
      ServiceDefinitionIdentifierToPlatformIdentifier[
        platform.identifier as ServiceDefinitionIdentifier
      ];
    if (!identifier || !platform.platform_id) {
      showSnackbar({
        severity: 'error',
        title: t('Utils.Error'),
        description: t(`Unregister.Failed.Description`),
      });
      return;
    }
    commitUnregisterPlatform(
      {
        input: {
          platformId: platform.platform_id,
          identifier,
          tenantId: platform.tenant_id,
        },
      },
      {
        onSuccess: () => {
          // The navigation lists the connected platforms: drop the one just disconnected.
          invalidatePrivateNavigationQueries(queryClient);
          router.push('/app');
          showSnackbar({
            severity: 'success',
            title: t('Utils.Success'),
            description: t('Unregister.Succeeded.Title', {
              platformIdentifier: platform.title,
            }),
          });
        },
        onError: (error) => {
          showSnackbar({
            severity: 'error',
            title: t('Utils.Error'),
            description: t(
              `Error.Server.${error instanceof Error ? error.message : 'UNKNOWN_ERROR'}`
            ),
          });
        },
      }
    );
  };

  return (
    !isTrial && (
      <GuardCapacityComponent
        capacityRestriction={[
          OrganizationCapability.AdministrateOrganization,
          OrganizationCapability.ManagePlatformRegistration,
        ]}>
        <ConfirmDialog
          confirmAnalyticsId="platform_disconnection_confirm"
          destructive
          title={t('Unregister.Confirm.Description')}
          onConfirm={unregisterPlatform}
          trigger={
            <Button
              {...analyticsId('platform_connection_delete')}
              variant="destructive">
              {t('Unregister.Unregister')}
            </Button>
          }
          confirmLabel={t('Utils.Continue')}>
          <p>
            {t('Unregister.Description', {
              platformName: platform.title,
              productName:
                PlatformMetadataMapping[
                  ServiceDefinitionIdentifierToPlatformIdentifier[
                    platform.identifier as ServiceDefinitionIdentifier
                  ] ?? PlatformIdentifier.Opencti
                ].name,
            })}
          </p>
        </ConfirmDialog>
      </GuardCapacityComponent>
    )
  );
};
