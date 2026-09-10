'use client';
import { EpicItemCard } from '@/components/epic/epic-item/EpicItemCard';
import { EpicItemDetailed } from '@/components/epic/epic-item/EpicItemDetailed';
import { useDetailParam } from '@/hooks/use-detail-param';
import { Dialog, DialogContent } from '@filigran/ui';
import { epic_fragment$data } from '@generated/epic_fragment.graphql';

interface EpicItemProps {
  epic: epic_fragment$data;
  serviceInstanceId: string;
  userCanUpdate: boolean;
  userCanDelete: boolean;
}

export const EpicItem = ({
  epic,
  serviceInstanceId,
  userCanUpdate,
  userCanDelete,
}: EpicItemProps) => {
  const { isOpen, close } = useDetailParam('epicId', epic.id);

  return (
    <li className="h-full">
      <EpicItemCard
        epic={epic}
        serviceInstanceId={serviceInstanceId}
        userCanDelete={userCanDelete}
        userCanUpdate={userCanUpdate}
      />
      <Dialog
        open={isOpen}
        onOpenChange={(open) => !open && close()}>
        <DialogContent className="p-0 w-full max-w-5xl h-[80vh] max-h-[90vh] flex flex-col overflow-hidden">
          <EpicItemDetailed
            epic={epic}
            serviceInstanceId={serviceInstanceId}
          />
        </DialogContent>
      </Dialog>
    </li>
  );
};
