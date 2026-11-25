import { useTranslate } from '@/hooks/use-translate';
import {
  PublicDocumentData,
  SHAREABLE_RESOURCE_PRODUCT_MAPPING,
  ShareableResourceType,
} from '@/utils/shareable-resources/shareable-resources.types';
import { Text } from '@filigran/design-system';
import { DocumentItemFragment } from '@graphql/generated';

interface ShareableResourceCardOverviewProps {
  document: DocumentItemFragment | PublicDocumentData;
}

const LIBRARY_LABEL_KEYS: Record<ShareableResourceType, string> = {
  [ShareableResourceType.OPENAEV_SCENARIO]: 'Menu.Scenarios',
  [ShareableResourceType.OPENCTI_INTEGRATION]: 'Menu.Integrations',
  [ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD]: 'Menu.CustomDashboards',
  [ShareableResourceType.OPENCTI_CUSTOM_VIEW]: 'Menu.CustomViews',
  [ShareableResourceType.OPENCTI_PLAYBOOK]: 'Menu.Playbooks',
};

/**
 * Platform and library the resource belongs to (e.g. "OpenCTI - Integrations"),
 * shown above the title so a card is self-explanatory outside of its library
 * (home page) and looks the same inside it (service pages).
 */
export const ShareableResourceCardOverview = ({
  document,
}: ShareableResourceCardOverviewProps) => {
  const t = useTranslate();
  const resourceType = document.type as ShareableResourceType;
  const libraryLabelKey = LIBRARY_LABEL_KEYS[resourceType];

  if (!libraryLabelKey) {
    return null;
  }

  return (
    <Text
      as="p"
      variant="content-compact"
      className="truncate text-filigran-brand-primary">
      {`${SHAREABLE_RESOURCE_PRODUCT_MAPPING[resourceType]} - ${t(libraryLabelKey)}`}
    </Text>
  );
};
