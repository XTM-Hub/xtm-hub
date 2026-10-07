import { EditionTypeMapping } from '@/components/epic/epic-item/EditionTypeMapping';
import { FiligranProductMapping } from '@/components/epic/epic-item/FiligranProductMapping';
import { sortFiligranProducts } from '@/components/epic/filigran-products';
import { Badge } from '@filigran/ui/servers';
import { epic_fragment$data } from '@generated/epic_fragment.graphql';
import { EditionType, EpicType } from '@graphql/generated';
import { ReactNode } from 'react';

interface EpicItemFooterProps {
  epic: epic_fragment$data;
  children?: ReactNode;
}
export const EpicItemFooter = ({ epic, children }: EpicItemFooterProps) => {
  return (
    <>
      <div className="flex flex-wrap items-start gap-x-s gap-y-xs">
        <div className="flex flex-wrap items-center gap-x-s gap-y-xs">
          {sortFiligranProducts(epic.products).map((product) => (
            <div
              key={product}
              className="flex h-9 items-center gap-xs whitespace-nowrap">
              <p className="bold">{FiligranProductMapping[product].logo}</p>

              <p className="bold">{FiligranProductMapping[product].name}</p>
            </div>
          ))}
          {epic.edition_type !== EditionType.CommunityEdition && (
            <Badge
              variant="secondary"
              className="font-semibold">
              {EditionTypeMapping[epic.edition_type].label}
            </Badge>
          )}
        </div>
        <div className="flex flex-1 items-center gap-s">
          {epic.epic_type === EpicType.Integration && (
            <div className="flex h-9 shrink-0 items-center">
              <div className="bold h-8 flex items-center capitalize txt-sub-content rounded bg-elevation-background-layer-0 text-text-default-primary p-s">
                {epic.epic_type.toLowerCase()}
              </div>
            </div>
          )}
          {children}
        </div>
      </div>
    </>
  );
};
