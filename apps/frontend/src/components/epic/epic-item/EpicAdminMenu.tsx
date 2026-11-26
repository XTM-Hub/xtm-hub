import { EpicFormSheet } from '@/components/epic/EpicFormSheet';
import { DeleteEpic } from '@/components/epic/epic-item/DeleteEpic';
import { IconActions, IconActionsItem } from '@/components/ui/IconActions';
import { ShareLinkButton } from '@/components/ui/share-link/ShareLinkButton';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { Chip } from '@filigran/design-system';
import { MoreVertIcon } from '@filigran/icon';
import { EpicFieldsFragment } from '@graphql/generated';
import { useState } from 'react';

interface EpicAdminMenuProps {
  epic: EpicFieldsFragment;
  userCanDelete?: boolean;
  userCanUpdate?: boolean;
}
export const EpicAdminMenu = ({
  epic,
  userCanUpdate = false,
  userCanDelete = false,
}: EpicAdminMenuProps) => {
  const t = useTranslate();

  const [deleteEpic, setDeleteEpic] = useState<EpicFieldsFragment | undefined>(
    undefined
  );
  const [updateEpic, setUpdateEpic] = useState<EpicFieldsFragment | undefined>(
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
      {/* eslint-disable-next-line no-restricted-syntax -- container whose children carry the IDs */}
      <div
        data-no-open-detail
        className="ml-auto flex h-9 shrink-0 items-center justify-end"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}>
        {!epic.active && (
          <Chip
            label={t('Epic.Timeline.draft')}
            severity="medium"
            className="mr-2"
          />
        )}
        <ShareLinkButton
          analyticsId="roadmap_epic_share"
          url={shareableUrl}
        />
        {(userCanDelete || userCanUpdate) && (
          <IconActions
            analyticsId="roadmap_epic_actions_open"
            aria-label={t('Utils.OpenMenu')}
            icon={<MoreVertIcon className="h-4 w-4 text-icon-highlight" />}>
            {userCanUpdate && (
              <IconActionsItem
                {...analyticsId('roadmap_epic_edit')}
                onClick={() => setUpdateEpic(epic)}>
                {t('Utils.Update')}
              </IconActionsItem>
            )}
            {userCanDelete && (
              <IconActionsItem
                {...analyticsId('roadmap_epic_delete')}
                onClick={() => setDeleteEpic(epic)}>
                {t('Utils.Delete')}
              </IconActionsItem>
            )}
          </IconActions>
        )}
      </div>
      {deleteEpic && (
        <DeleteEpic
          key={`delete-${deleteEpic.id}`}
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
