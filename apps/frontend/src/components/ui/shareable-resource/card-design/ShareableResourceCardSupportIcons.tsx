import { ResourceStatusIcons } from '@/components/ui/ResourceStatusIcons';
import { PublicDocumentData } from '@/utils/shareable-resources/shareable-resources.types';
import { docHasMetadata } from '@/utils/shareable-resources/utils/shareable-resources.client.utils';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { DocumentMetadataKeyCode } from '@graphql/generated';

interface ShareableResourceCardSupportIconsProps {
  document: documentItem_fragment$data | PublicDocumentData;
}

export const ShareableResourceCardSupportIcons = ({
  document,
}: ShareableResourceCardSupportIconsProps) => {
  const deployable =
    document.active &&
    docHasMetadata(document, DocumentMetadataKeyCode.ManagerSupported) &&
    !!document.manager_supported;

  const verified =
    document.active &&
    docHasMetadata(document, DocumentMetadataKeyCode.Verified) &&
    !!document.verified;

  return (
    <div className="flex gap-s">
      <ResourceStatusIcons
        deployable={deployable}
        verified={verified}
        displayUnverifiedIcon
      />
    </div>
  );
};
