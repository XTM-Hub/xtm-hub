import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { IconActionsItem } from '@/components/ui/IconActions';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { Button } from '@filigran/design-system';
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
      <ConfirmDialog
        confirmAnalyticsId="resource_deletion_confirm"
        confirmLabel={t('Utils.Delete')}
        destructive
        title={t(`Service.${translationKey}.DeleteService`, {
          name: serviceName,
        })}
        trigger={
          type === 'menuitem' ? (
            <IconActionsItem
              {...analyticsId('resource_delete')}
              onSelect={(e) => {
                e.preventDefault();
              }}>
              {t('Utils.Delete')}
            </IconActionsItem>
          ) : (
            <Button
              {...analyticsId('resource_delete')}
              variant="destructive"
              priority="secondary">
              {t('Utils.Delete')}
            </Button>
          )
        }
        onConfirm={() => {
          onDelete?.();
        }}>
        {t(`Service.${translationKey}.SureDeleteService`, {
          name: serviceName,
        })}
      </ConfirmDialog>
    )
  );
};
