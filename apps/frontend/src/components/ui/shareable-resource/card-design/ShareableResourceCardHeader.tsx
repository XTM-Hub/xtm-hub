import { ShareableResourceEntityTypes } from '@/components/service/document/ui/ShareableResourceEntityTypes';
import BadgeOverflowCounter, {
  BadgeOverflow,
} from '@/components/ui/BadgeOverflowCounter';
import { ShareableResourceCardIcon } from '@/components/ui/shareable-resource/card-design/ShareableResourceCardIcon';
import { ShareableResourceCardImage } from '@/components/ui/shareable-resource/card-design/ShareableResourceCardImage';
import { cn } from '@/lib/utils';
import { PublicDocumentData } from '@/utils/shareable-resources/shareable-resources.types';
import { getDocumentEntityTypes } from '@/utils/shareable-resources/utils/shareable-resources.client.utils';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';

interface ShareableResourceCardHeaderProps {
  document: documentItem_fragment$data | PublicDocumentData;
  serviceInstanceId: string;
  shouldDisplayBothIcons: boolean;
  isConnector: boolean;
}
export const ShareableResourceCardHeader = ({
  document,
  serviceInstanceId,
  shouldDisplayBothIcons,
  isConnector,
}: ShareableResourceCardHeaderProps) => {
  const documentNameSize = document.name?.length ?? 0;

  return (
    <div
      className={cn(
        'flex gap-m p-m relative',
        isConnector ? 'items-center' : 'items-stretch'
      )}>
      <ShareableResourceCardImage
        document={document}
        serviceInstanceId={serviceInstanceId}
      />
      <div
        className={cn('flex-1 min-w-0', isConnector && 'flex flex-col gap-s')}>
        <div className="flex items-center gap-2">
          <h2
            className={cn(
              'text-base font-semibold leading-tight min-w-0 pr-xxl',
              documentNameSize <= 30 && 'md:text-lg'
            )}>
            {document.name}
          </h2>
          <ShareableResourceCardIcon
            shouldDisplayBothIcons={shouldDisplayBothIcons}
            document={document}
          />
        </div>
        {isConnector ? (
          <ShareableResourceEntityTypes
            document={{ entity_types: getDocumentEntityTypes(document) }}
            className="mt-s z-[2]"
          />
        ) : (
          <div className="mt-s flex flex-wrap gap-s">
            <BadgeOverflowCounter
              formatLabel={false}
              badges={document.use_cases as BadgeOverflow[]}
              className="z-[2]"
            />
          </div>
        )}
      </div>
    </div>
  );
};
