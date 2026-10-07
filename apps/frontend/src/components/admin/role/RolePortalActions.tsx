import DeleteRolePortal from '@/components/admin/role/DeleteRolePortal';
import EditRolePortal from '@/components/admin/role/EditRolePortal';
import { IconActions, IconActionsItem } from '@/components/ui/IconActions';
import { useTranslate } from '@/hooks/use-translate';
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
        icon={
          <>
            <MoreVertIcon className="h-4 w-4 text-primary" />
            <span className="sr-only">{t('Utils.OpenMenu')}</span>
          </>
        }>
        <IconActionsItem onClick={() => setOpenEdit(true)}>
          {t('Utils.Update')}
        </IconActionsItem>
        <IconActionsItem onClick={() => setOpenDelete(true)}>
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
