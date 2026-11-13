'use client';
import { EpicItemCard } from '@/components/epic/epic-item/EpicItemCard';
import { EpicItemDetailed } from '@/components/epic/epic-item/EpicItemDetailed';
import { useDetailParam } from '@/hooks/use-detail-param';
import { analyticsEpic } from '@/lib/analytics/analytics.context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@filigran/design-system';
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
    <li
      {...analyticsEpic(epic.title)}
      className="h-full">
      <EpicItemCard
        epic={epic}
        userCanDelete={userCanDelete}
        userCanUpdate={userCanUpdate}
      />
      <Dialog
        open={isOpen}
        onOpenChange={(open) => !open && close()}>
        <DialogContent
          {...analyticsEpic(epic.title)}
          size="lg">
          <div className="flex flex-col gap-1">
            <DialogTitle>{epic.title}</DialogTitle>
            <DialogDescription className="text-default-secondary">
              {epic.short_description}
            </DialogDescription>
          </div>
          <EpicItemDetailed epic={epic} />
        </DialogContent>
      </Dialog>
    </li>
  );
};
