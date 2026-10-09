import { EpicAdminMenu } from '@/components/epic/epic-item/EpicAdminMenu';
import { EpicItemFooter } from '@/components/epic/epic-item/EpicItemFooter';
import { DetailCard } from '@/components/ui/DetailCard';
import { Separator } from '@/components/ui/separator';
import { useDetailParam } from '@/hooks/use-detail-param';
import { epic_fragment$data } from '@generated/epic_fragment.graphql';

interface EpicItemCardProps {
  epic: epic_fragment$data;
  userCanDelete: boolean;
  userCanUpdate: boolean;
}

export const EpicItemCard = ({
  epic,
  userCanDelete,
  userCanUpdate,
}: EpicItemCardProps) => {
  const { open: openDetail } = useDetailParam('epicId', epic.id);

  return (
    <DetailCard
      onOpenDetail={openDetail}
      title={epic.title}
      description={epic.short_description}
      footer={
        <>
          <Separator />
          <div className="mt-m">
            <EpicItemFooter epic={epic}>
              <EpicAdminMenu
                epic={epic}
                userCanDelete={userCanDelete}
                userCanUpdate={userCanUpdate}
              />
            </EpicItemFooter>
          </div>
        </>
      }
    />
  );
};
