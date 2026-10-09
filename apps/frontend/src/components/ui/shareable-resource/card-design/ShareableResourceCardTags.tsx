import BadgeOverflowCounter, {
  BadgeOverflow,
} from '@/components/ui/BadgeOverflowCounter';
import { ShareableResourceTypeChip } from '@/components/ui/shareable-resource/ShareableResourceTypeChip';
import { PublicDocumentData } from '@/utils/shareable-resources/shareable-resources.types';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';

interface ShareableResourceCardTagsProps {
  document: documentItem_fragment$data | PublicDocumentData;
}

export const ShareableResourceCardTags = ({
  document,
}: ShareableResourceCardTagsProps) => {
  return (
    <div className="flex min-w-0 items-center gap-s">
      <ShareableResourceTypeChip document={document} />
      <BadgeOverflowCounter
        variant="chip"
        formatLabel={false}
        badges={(document.use_cases ?? []) as BadgeOverflow[]}
        className="z-[2]"
      />
    </div>
  );
};
