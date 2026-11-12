import DeleteRolePortal from '@/components/admin/role/DeleteRolePortal';
import EditRolePortal from '@/components/admin/role/EditRolePortal';
import { IconActions, IconActionsItem } from '@/components/ui/IconActions';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { MoreVertIcon } from '@filigran/icon';
import { PortalCapability } from '@graphql/generated';
import { useState } from 'react';

interface RolePortalActionsProps {
  rolePortal: string;
  capabilities: PortalCapability[];
}

const RolePortalActions = ({
  rolePortal,
  capabilities,
}: RolePortalActionsProps) => {
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
          {...analyticsId('admin_role_edit')}
          onClick={() => setOpenEdit(true)}>
          {t('Utils.Update')}
        </IconActionsItem>
        <IconActionsItem
          {...analyticsId('admin_role_delete')}
          onClick={() => setOpenDelete(true)}>
          {t('Utils.Delete')}
        </IconActionsItem>
      </IconActions>
      {openEdit && (
        <EditRolePortal
          open={openEdit}
          onOpenChange={setOpenEdit}
          rolePortal={rolePortal}
          capabilities={capabilities}
        />
      )}
      <DeleteRolePortal
        open={openDelete}
        onOpenChange={setOpenDelete}
        rolePortal={rolePortal}
      />
    </>
  );
};

export default RolePortalActions;
