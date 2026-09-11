import { EditionTypeMapping } from '@/components/epic/epic-item/EditionTypeMapping';
import { FiligranProductMapping } from '@/components/epic/epic-item/FiligranProductMapping';
import { sortFiligranProducts } from '@/components/epic/filigran-products';
import { Badge } from '@filigran/ui/servers';
import { epic_fragment$data } from '@generated/epic_fragment.graphql';
import { EditionType, EpicType } from '@graphql/generated';
import Image from 'next/image';

interface EpicItemFooterProps {
  epic: epic_fragment$data;
  serviceInstanceId: string;
  shiftEpicType?: boolean;
}
export const EpicItemFooter = ({
  epic,
  serviceInstanceId,
  shiftEpicType = false,
}: EpicItemFooterProps) => {
  return (
    <>
      <div className="flex w-full items-center justify-between">
        <div className="flex flex-wrap items-center gap-s">
          {sortFiligranProducts(epic.product).map((product) => (
            <div
              key={product}
              className="flex items-center gap-xs">
              <p className="bold">{FiligranProductMapping[product].logo}</p>

              <p className="bold">{FiligranProductMapping[product].name}</p>
            </div>
          ))}
          {epic.edition_type !== EditionType.CommunityEdition && (
            <Badge
              variant="secondary"
              className="ml-s font-semibold">
              {EditionTypeMapping[epic.edition_type].label}
            </Badge>
          )}
        </div>
        {epic.document_id && epic.epic_type === EpicType.Integration && (
          <div
            className={`flex items-center mr-s gap-xs ${shiftEpicType ? 'pr-xxl' : ''}`}>
            <Image
              src={`/document/images/${serviceInstanceId}/${epic.document_id}`}
              alt={`${epic.title} logo`}
              width={32}
              height={32}
              loading="lazy"
              className="h-8 w-auto rounded object-contain"
            />
            <div className="bold h-8 flex items-center capitalize txt-sub-content rounded bg-elevation-background-layer-0 text-negative-primary p-s">
              {epic.epic_type.toLowerCase()}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
