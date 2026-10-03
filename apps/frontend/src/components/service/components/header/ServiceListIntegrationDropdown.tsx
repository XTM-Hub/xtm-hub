import { Button } from '@filigran/design-system';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@filigran/ui';
import { IntegrationType } from '@graphql/generated';
import { useTranslations } from 'next-intl';

interface ServiceListIntegrationDropdownProps {
  onIntegrationTypeSelect: (integrationType: IntegrationType) => void;
}

export const ServiceListIntegrationDropdown = ({
  onIntegrationTypeSelect,
}: ServiceListIntegrationDropdownProps) => {
  const t = useTranslations();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>{t('Service.OpenctiIntegrations.AddService')}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>
          {t('Service.OpenctiIntegrations.IntegrationType')}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => onIntegrationTypeSelect(IntegrationType.CsvFeed)}>
          {t(`Service.OpenctiIntegrations.Type.csv_feed`)}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onIntegrationTypeSelect(IntegrationType.TaxiiFeed)}>
          {t(`Service.OpenctiIntegrations.Type.taxii_feed`)}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onIntegrationTypeSelect(IntegrationType.Stream)}>
          {t(`Service.OpenctiIntegrations.Type.stream`)}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() =>
            onIntegrationTypeSelect(IntegrationType.ThirdPartyIntegration)
          }>
          {t(`Service.OpenctiIntegrations.Type.third_party_integration`)}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onIntegrationTypeSelect(IntegrationType.RssFeed)}>
          {t(`Service.OpenctiIntegrations.Type.rss_feed`)}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
