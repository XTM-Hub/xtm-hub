import BadgeOverflowCounter, {
  BadgeOverflow,
} from '@/components/ui/BadgeOverflowCounter';
import { ShareableResourceTypeChip } from '@/components/ui/shareable-resource/ShareableResourceTypeChip';
import {
  isIntegrationItem,
  PublicDocumentData,
} from '@/utils/shareable-resources/shareable-resources.types';
import { DocumentItemFragment } from '@graphql/generated';

interface ShareableResourceCardTagsProps {
  document: DocumentItemFragment | PublicDocumentData;
}

export const ShareableResourceCardTags = ({
  document,
}: ShareableResourceCardTagsProps) => {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {isIntegrationItem(document) && (
        <ShareableResourceTypeChip document={document} />
      )}
      <BadgeOverflowCounter
        variant="chip"
        formatLabel={false}
        badges={(document.use_cases ?? []) as BadgeOverflow[]}
        className="z-[2]"
      />
    </div>
  );
};
