import { useTranslate } from '@/hooks/use-translate';
import { cn } from '@/lib/utils';
import {
  isIntegrationItem,
  PublicDocumentData,
  ShareableResourceType,
} from '@/utils/shareable-resources/shareable-resources.types';
import { Chip } from '@filigran/design-system';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';

interface ShareableResourceTypeChipProps {
  document: documentItem_fragment$data | PublicDocumentData;
  className?: string;
}

const RESOURCE_TYPE_LABEL_KEYS: Partial<Record<ShareableResourceType, string>> =
  {
    [ShareableResourceType.OPENAEV_SCENARIO]: 'Menu.Scenarios',
    [ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD]: 'Menu.CustomDashboards',
    [ShareableResourceType.OPENCTI_CUSTOM_VIEW]: 'Menu.CustomViews',
    [ShareableResourceType.OPENCTI_PLAYBOOK]: 'Menu.Playbooks',
  };

const getTypeLabelKey = (
  document: documentItem_fragment$data | PublicDocumentData
) => {
  if (isIntegrationItem(document)) {
    return `Service.OpenctiIntegrations.Type.${document.integration_type}`;
  }
  return RESOURCE_TYPE_LABEL_KEYS[document.type as ShareableResourceType];
};

export const ShareableResourceTypeChip = ({
  document,
  className,
}: ShareableResourceTypeChipProps) => {
  const t = useTranslate();
  const typeLabelKey = getTypeLabelKey(document);

  if (!typeLabelKey) {
    return null;
  }

  const label = t(typeLabelKey);

  return (
    <Chip
      label={label}
      title={label}
      severity="info"
      className={cn('shrink-0', className)}
    />
  );
};
