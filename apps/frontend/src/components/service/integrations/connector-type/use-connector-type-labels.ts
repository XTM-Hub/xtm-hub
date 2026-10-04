import {
  humanizeIdentifier,
  isConnectorType,
  isHuntPlatform,
} from '@/components/service/integrations/connector-type/connector-type.utils';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

export const useConnectorTypeLabels = () => {
  const t = useTranslations();

  return useMemo(
    () => ({
      connectorTypeLabel: (connectorType: string): string =>
        isConnectorType(connectorType)
          ? t(`Service.OpenctiIntegrations.ConnectorType.${connectorType}`)
          : humanizeIdentifier(connectorType),
      huntPlatformLabel: (huntPlatform: string): string =>
        isHuntPlatform(huntPlatform)
          ? t(`Service.OpenctiIntegrations.HuntPlatform.${huntPlatform}`)
          : humanizeIdentifier(huntPlatform),
    }),
    [t]
  );
};
