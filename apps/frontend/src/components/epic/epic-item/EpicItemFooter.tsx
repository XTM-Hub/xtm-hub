import { EditionTypeMapping } from '@/components/epic/epic-item/EditionTypeMapping';
import { FiligranProductMapping } from '@/components/epic/epic-item/FiligranProductMapping';
import { sortFiligranProducts } from '@/components/epic/filigran-products';
import { Chip } from '@filigran/design-system';
import { EditionType, EpicFieldsFragment, EpicType } from '@graphql/generated';
import { ReactNode } from 'react';

interface EpicItemFooterProps {
  epic: EpicFieldsFragment;
  children?: ReactNode;
}
export const EpicItemFooter = ({ epic, children }: EpicItemFooterProps) => {
  return (
    <>
      <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {sortFiligranProducts(epic.products).map((product) => (
            <div
              key={product}
              className="flex h-9 items-center gap-1 whitespace-nowrap">
              <p className="bold">{FiligranProductMapping[product].logo}</p>

              <p className="bold">{FiligranProductMapping[product].name}</p>
            </div>
          ))}
          {epic.edition_type !== EditionType.CommunityEdition && (
            <Chip
              label={EditionTypeMapping[epic.edition_type].label}
              severity="ee"
            />
          )}
        </div>
        <div className="flex flex-1 items-center gap-2">
          {epic.epic_type === EpicType.Integration && (
            <div className="flex h-9 shrink-0 items-center">
              <div className="h-8 flex items-center capitalize content-compact rounded layer-0 bg-elevation-default text-default-primary p-2">
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
