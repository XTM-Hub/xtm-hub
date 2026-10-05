import DeleteSsoGroupRolePortal from '@/components/admin/role/DeleteSsoGroupRolePortal';
import EditSsoGroupRolePortal from '@/components/admin/role/EditSsoGroupRolePortal';
import { IconActions, IconActionsItem } from '@/components/ui/IconActions';
import { MoreVertIcon } from '@filigran/icon';
import { PortalCapability } from '@graphql/generated';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

interface SsoGroupRolePortalActionsProps {
  ssoGroup: string;
  rolePortal: string;
  capabilities: PortalCapability[];
}

const SsoGroupRolePortalActions = ({
  ssoGroup,
  rolePortal,
  capabilities,
}: SsoGroupRolePortalActionsProps) => {
  const t = useTranslations();
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
        <EditSsoGroupRolePortal
          open={openEdit}
          onOpenChange={setOpenEdit}
          ssoGroup={ssoGroup}
          rolePortal={rolePortal}
          capabilities={capabilities}
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
