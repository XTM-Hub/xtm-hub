import { ShareableResourceCardImage } from '@/components/ui/shareable-resource/card-design/ShareableResourceCardImage';
import { ShareableResourceCardTags } from '@/components/ui/shareable-resource/card-design/ShareableResourceCardTags';
import { PublicDocumentData } from '@/utils/shareable-resources/shareable-resources.types';
import { Text } from '@filigran/design-system';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';

interface ShareableResourceCardHeaderProps {
  document: documentItem_fragment$data | PublicDocumentData;
  serviceInstanceId: string;
}
export const ShareableResourceCardHeader = ({
  document,
  serviceInstanceId,
}: ShareableResourceCardHeaderProps) => {
  return (
    <div className="flex shrink-0 flex-col gap-6">
      <div className="flex items-start gap-4">
        <ShareableResourceCardImage
          document={document}
          serviceInstanceId={serviceInstanceId}
        />
        <div className="flex min-h-12 min-w-0 flex-1 items-center">
          <Text
            as="h2"
            variant="title-sm"
            title={document.name ?? undefined}
            className="min-w-0 break-words line-clamp-2">
            {document.name}
          </Text>
        </div>
      </div>
      <ShareableResourceCardTags document={document} />
    </div>
  );
};
