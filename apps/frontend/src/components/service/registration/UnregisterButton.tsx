import GuardCapacityComponent from '@/components/AdminGuard';
import {
  PlatformMetadataMapping,
  ServiceDefinitionIdentifierToPlatformIdentifier,
} from '@/components/registration/PlatformIdentifierMapping';
import { UnregisterPlatform } from '@/components/registration/register/register.graphql';
import { AlertDialogComponent } from '@/components/ui/AlertDialog';
import { useTranslate } from '@/hooks/use-translate';
import { toast } from '@filigran/ui';
import { Button } from '@filigran/ui/servers';
import { registeredPlatformByServiceInstanceId_fragment$data } from '@generated/registeredPlatformByServiceInstanceId_fragment.graphql';
import { registerUnregisterPlatformMutation } from '@generated/registerUnregisterPlatformMutation.graphql';
import {
  OrganizationCapability,
  PlatformContract,
  PlatformIdentifier,
  ServiceDefinitionIdentifier,
} from '@graphql/generated';
import { useRouter } from 'next/navigation';
import { useMutation } from 'react-relay';

interface UnregisterButtonProps {
  platform: registeredPlatformByServiceInstanceId_fragment$data;
}

export const UnregisterButton = ({ platform }: UnregisterButtonProps) => {
  const t = useTranslate();
  const router = useRouter();

  const isTrial = platform.contract === PlatformContract.Trial;

  const [commitUnregisterPlatform] =
    useMutation<registerUnregisterPlatformMutation>(UnregisterPlatform);

  const unregisterPlatform = () => {
    const identifier =
      ServiceDefinitionIdentifierToPlatformIdentifier[
        platform.identifier as ServiceDefinitionIdentifier
      ];
    if (!identifier || !platform.platform_id) {
      toast({
        variant: 'destructive',
        title: t('Utils.Error'),
        description: t(`Unregister.Failed.Description`),
      });
      return;
    }
    commitUnregisterPlatform({
      variables: {
        input: {
          platformId: platform.platform_id,
          identifier,
          tenantId: platform.tenant_id,
        },
      },
      onCompleted: () => {
        router.push('/app');
        toast({
          title: t('Utils.Success'),
          description: t('Unregister.Succeeded.Title', {
            platformIdentifier: platform.title,
          }),
        });
      },
      onError: (error) => {
        toast({
          variant: 'destructive',
          title: t('Utils.Error'),
          description: t(`Error.Server.${error.message}`),
        });
      },
    });
  };

  return (
    !isTrial && (
      <GuardCapacityComponent
        capacityRestriction={[
          OrganizationCapability.AdministrateOrganization,
          OrganizationCapability.ManagePlatformRegistration,
        ]}>
        <AlertDialogComponent
          variantName={'destructive'}
          AlertTitle={t('Unregister.Confirm.Description')}
          onClickContinue={unregisterPlatform}
          triggerElement={
            <Button variant="destructive">{t('Unregister.Unregister')}</Button>
          }
          actionButtonText={t('Utils.Continue')}>
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
        </AlertDialogComponent>
      </GuardCapacityComponent>
    )
  );
};
