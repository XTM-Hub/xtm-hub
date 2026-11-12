import DeleteSsoGroupRolePortal from '@/components/admin/role/DeleteSsoGroupRolePortal';
import EditSsoGroupRolePortal from '@/components/admin/role/EditSsoGroupRolePortal';
import { IconActions, IconActionsItem } from '@/components/ui/IconActions';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { MoreVertIcon } from '@filigran/icon';
import { useState } from 'react';

interface SsoGroupRolePortalActionsProps {
  ssoGroup: string;
  rolePortal: string;
}

const SsoGroupRolePortalActions = ({
  ssoGroup,
  rolePortal,
}: SsoGroupRolePortalActionsProps) => {
  const t = useTranslate();
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);

  return (
    <>
      <IconActions
        analyticsId="list_row_actions_open"
        aria-label={t('Utils.OpenMenu')}
        icon={<MoreVertIcon className="h-4 w-4 text-icon-highlight" />}>
        <IconActionsItem
          {...analyticsId('admin_sso_group_mapping_edit')}
          onClick={() => setOpenEdit(true)}>
          {t('Utils.Update')}
        </IconActionsItem>
        <IconActionsItem
          {...analyticsId('admin_sso_group_mapping_delete')}
          onClick={() => setOpenDelete(true)}>
          {t('Utils.Delete')}
        </IconActionsItem>
      </IconActions>
      {openEdit && (
        <EditSsoGroupRolePortal
          open={openEdit}
          onOpenChange={setOpenEdit}
          ssoGroup={ssoGroup}
          rolePortal={rolePortal}
        />
      )}
      <DeleteSsoGroupRolePortal
        open={openDelete}
        onOpenChange={setOpenDelete}
        ssoGroup={ssoGroup}
        rolePortal={rolePortal}
      />
    </>
  );
};

export default SsoGroupRolePortalActions;
