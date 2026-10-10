import { useTranslate } from '@/hooks/use-translate';
import {
  Button,
  Menu,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
} from '@filigran/design-system';
import { IntegrationType } from '@graphql/generated';

interface ServiceListIntegrationDropdownProps {
  onIntegrationTypeSelect: (integrationType: IntegrationType) => void;
}

export const ServiceListIntegrationDropdown = ({
  onIntegrationTypeSelect,
}: ServiceListIntegrationDropdownProps) => {
  const t = useTranslate();
  return (
    <Menu>
      <MenuTrigger asChild>
        <Button>{t('Service.OpenctiIntegrations.AddService')}</Button>
      </MenuTrigger>
      <MenuContent>
        <MenuGroup>
          <MenuLabel>
            {t('Service.OpenctiIntegrations.IntegrationType')}
          </MenuLabel>

          <MenuSeparator />

          <MenuItem
            onClick={() => onIntegrationTypeSelect(IntegrationType.CsvFeed)}>
            {t(`Service.OpenctiIntegrations.Type.csv_feed`)}
          </MenuItem>
          <MenuItem
            onClick={() => onIntegrationTypeSelect(IntegrationType.TaxiiFeed)}>
            {t(`Service.OpenctiIntegrations.Type.taxii_feed`)}
          </MenuItem>
          <MenuItem
            onClick={() => onIntegrationTypeSelect(IntegrationType.Stream)}>
            {t(`Service.OpenctiIntegrations.Type.stream`)}
          </MenuItem>

          <MenuItem
            onClick={() =>
              onIntegrationTypeSelect(IntegrationType.ThirdPartyIntegration)
            }>
            {t(`Service.OpenctiIntegrations.Type.third_party_integration`)}
          </MenuItem>
          <MenuItem
            onClick={() => onIntegrationTypeSelect(IntegrationType.RssFeed)}>
            {t(`Service.OpenctiIntegrations.Type.rss_feed`)}
          </MenuItem>
        </MenuGroup>
      </MenuContent>
    </Menu>
  );
};
