import {
  humanizeIdentifier,
  isConnectorType,
  isHuntPlatform,
} from '@/components/service/integrations/connector-type/connector-type.utils';
import { useTranslate } from '@/hooks/use-translate';
import { useMemo } from 'react';

export const useConnectorTypeLabels = () => {
  const t = useTranslate();

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
