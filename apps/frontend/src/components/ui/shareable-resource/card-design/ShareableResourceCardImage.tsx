import { getEntityTypes } from '@/components/service/document/ui/ShareableResourceEntityTypes';
import { findDocumentLogo } from '@/utils/documents';
import { EntityTypeOrFiligranLogo } from '@/utils/shareable-resources/entity-type';
import { PublicDocumentData } from '@/utils/shareable-resources/shareable-resources.types';
import { getDocumentEntityTypes } from '@/utils/shareable-resources/utils/shareable-resources.client.utils';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import Image from 'next/image';

interface ShareableResourceCardImageProps {
  document: documentItem_fragment$data | PublicDocumentData;
  serviceInstanceId: string;
}
export const ShareableResourceCardImage = ({
  document,
  serviceInstanceId,
}: ShareableResourceCardImageProps) => {
  const logo = findDocumentLogo(document);

  return (
    <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-elevation-highlight">
      {logo ? (
        <Image
          src={`/document/images/${serviceInstanceId}/${logo.id}`}
          alt={`${document.name} logo`}
          width={48}
          height={48}
          loading="lazy"
          className="size-full object-contain"
        />
      ) : (
        <EntityTypeOrFiligranLogo
          className="size-8"
          entityTypes={getEntityTypes({
            entity_types: getDocumentEntityTypes(document),
          })}
        />
      )}
    </div>
  );
};
