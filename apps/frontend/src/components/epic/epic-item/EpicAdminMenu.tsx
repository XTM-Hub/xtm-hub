import { EpicFormSheet } from '@/components/epic/EpicFormSheet';
import { DeleteEpic } from '@/components/epic/epic-item/DeleteEpic';
import { IconActions, IconActionsItem } from '@/components/ui/IconActions';
import { ShareLinkButton } from '@/components/ui/share-link/ShareLinkButton';
import { useEpicListContext } from '@/hooks/use-epic-list-context';
import { useTranslate } from '@/hooks/use-translate';
import { MoreVertIcon } from '@filigran/icon';
import { Badge } from '@filigran/ui/servers';
import { epic_fragment$data } from '@generated/epic_fragment.graphql';
import { useState } from 'react';

interface EpicAdminMenuProps {
  epic: epic_fragment$data;
  userCanDelete?: boolean;
  userCanUpdate?: boolean;
}
export const EpicAdminMenu = ({
  epic,
  userCanUpdate = false,
  userCanDelete = false,
}: EpicAdminMenuProps) => {
  const t = useTranslate();

  const { connectionID } = useEpicListContext();

  const [deleteEpic, setDeleteEpic] = useState<epic_fragment$data | undefined>(
    undefined
  );
  const [updateEpic, setUpdateEpic] = useState<epic_fragment$data | undefined>(
    undefined
  );

  let shareableUrl = '';
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    url.searchParams.set('epicId', epic.id);
    shareableUrl = url.toString();
  }

  return (
    <>
      <div
        data-no-open-detail
        className="flex items-center justify-end mt-auto"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}>
        {!epic.active && (
          <Badge
            variant="warning"
            className="font-semibold mr-s">
            {t('Epic.Timeline.draft')}
          </Badge>
        )}
        <ShareLinkButton
          url={shareableUrl}
          documentId={epic.document_id}
        />
        {(userCanDelete || userCanUpdate) && (
          <IconActions
            icon={
              <>
                <MoreVertIcon className="h-4 w-4 text-primary" />
                <span className="sr-only">{t('Utils.OpenMenu')}</span>
              </>
            }>
            {userCanUpdate && (
              <IconActionsItem onClick={() => setUpdateEpic(epic)}>
                {t('Utils.Update')}
              </IconActionsItem>
            )}
            {userCanDelete && (
              <IconActionsItem onClick={() => setDeleteEpic(epic)}>
                {t('Utils.Delete')}
              </IconActionsItem>
            )}
          </IconActions>
        )}
      </div>
      {deleteEpic && (
        <DeleteEpic
          key={`delete-${deleteEpic.id}`}
          connectionId={connectionID}
          epic={deleteEpic}
          open={!!deleteEpic}
          setOpen={(open) => setDeleteEpic(open ? deleteEpic : undefined)}
        />
      )}
      {updateEpic && (
        <EpicFormSheet
          epic={updateEpic}
          open={!!updateEpic}
          setOpen={(open) => setUpdateEpic(open ? updateEpic : undefined)}
        />
      )}
    </>
  );
};
