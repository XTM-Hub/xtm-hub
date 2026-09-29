import { AlertDialogComponent } from '@/components/ui/AlertDialog';
import { IconActionsItem } from '@/components/ui/IconActions';
import { useTranslate } from '@/hooks/use-translate';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { Button } from '@filigran/ui';
import { IntegrationType } from '@graphql/generated';

interface ServiceDeleteProps {
  userCanDelete?: boolean;
  onDelete?: () => void;
  serviceName: string;
  integrationType: CardTypeEnum;
  type?: 'menuitem' | 'button';
}

export type CardTypeEnum = IntegrationType | ShareableResourceType;

const INTEGRATION_TRANSLATION_KEY_MAP: Partial<Record<CardTypeEnum, string>> = {
  [IntegrationType.CsvFeed]: 'CsvFeed',
  [IntegrationType.Connector]: 'Connector',
  [IntegrationType.TaxiiFeed]: 'TaxiiFeed',
  [IntegrationType.RssFeed]: 'RssFeed',
  [IntegrationType.Stream]: 'Stream',
  [IntegrationType.ThirdPartyIntegration]: 'ThirdPartyIntegration',
  [ShareableResourceType.OPENAEV_SCENARIO]: 'OpenAEVScenario',
  [ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD]: 'OpenctiCustomDashboards',
  [ShareableResourceType.OPENCTI_CUSTOM_VIEW]: 'OpenctiCustomViews',
};

export const ServiceDelete = ({
  userCanDelete,
  onDelete,
  serviceName,
  integrationType,
  type = 'button',
}: ServiceDeleteProps) => {
  const t = useTranslate();
  const translationKey =
    INTEGRATION_TRANSLATION_KEY_MAP[integrationType] ?? 'CsvFeed';

  return (
    userCanDelete && (
      <AlertDialogComponent
        actionButtonText={t('Utils.Delete')}
        variantName={'destructive'}
        AlertTitle={t(`Service.${translationKey}.DeleteService`, {
          name: serviceName,
        })}
        triggerElement={
          type === 'menuitem' ? (
            <IconActionsItem
              onSelect={(e) => {
                e.preventDefault();
              }}>
              {t('Utils.Delete')}
            </IconActionsItem>
          ) : (
            <Button variant={'secondary-destructive'}>
              {t('Utils.Delete')}
            </Button>
          )
        }
        onClickContinue={() => {
          onDelete?.();
        }}>
        {t(`Service.${translationKey}.SureDeleteService`, {
          name: serviceName,
        })}
      </AlertDialogComponent>
    )
  );
};
