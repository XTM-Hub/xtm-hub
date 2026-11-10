'use client';
import { EpicItemCard } from '@/components/epic/epic-item/EpicItemCard';
import { EpicItemDetailed } from '@/components/epic/epic-item/EpicItemDetailed';
import { useDetailParam } from '@/hooks/use-detail-param';
import { Dialog, DialogContent } from '@filigran/design-system';
import { EpicFieldsFragment } from '@graphql/generated';

interface EpicItemProps {
  epic: EpicFieldsFragment;
  userCanUpdate: boolean;
  userCanDelete: boolean;
}

export const EpicItem = ({
  epic,
  userCanUpdate,
  userCanDelete,
}: EpicItemProps) => {
  const { isOpen, close } = useDetailParam('epicId', epic.id);

  return (
    <li className="h-full">
      <EpicItemCard
        epic={epic}
        userCanDelete={userCanDelete}
        userCanUpdate={userCanUpdate}
      />
      <Dialog
        open={isOpen}
        onOpenChange={(open) => !open && close()}>
        <DialogContent size="lg">
          <EpicItemDetailed epic={epic} />
        </DialogContent>
      </Dialog>
    </li>
  );
};
