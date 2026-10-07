'use client';

import { getConnectorTypeIcon } from '@/components/service/integrations/connector-type/connector-type.utils';
import { useConnectorTypeLabels } from '@/components/service/integrations/connector-type/use-connector-type-labels';
import { Icon } from '@filigran/design-system';

interface ConnectorTypeLabelProps {
  connectorType: string;
}

export const ConnectorTypeLabel = ({
  connectorType,
}: ConnectorTypeLabelProps) => {
  const { connectorTypeLabel } = useConnectorTypeLabels();

  return (
    <span className="inline-flex items-center gap-s">
      <Icon
        name={getConnectorTypeIcon(connectorType)}
        size={16}
      />
      <span>{connectorTypeLabel(connectorType)}</span>
    </span>
  );
};
