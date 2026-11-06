import { ResourceStatusIcons } from '@/components/ui/ResourceStatusIcons';
import { PublicDocumentData } from '@/utils/shareable-resources/shareable-resources.types';
import { docHasMetadata } from '@/utils/shareable-resources/utils/shareable-resources.client.utils';
import {
  DocumentItemFragment,
  DocumentMetadataKeyCode,
} from '@graphql/generated';

interface ShareableResourceCardSupportIconsProps {
  document: DocumentItemFragment | PublicDocumentData;
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
    <div className="flex gap-2">
      <ResourceStatusIcons
        deployable={deployable}
        verified={verified}
        displayUnverifiedIcon
      />
    </div>
  );
};
