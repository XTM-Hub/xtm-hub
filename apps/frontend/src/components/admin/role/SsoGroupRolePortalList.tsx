import AddSsoGroupRolePortal from '@/components/admin/role/AddSsoGroupRolePortal';
import SsoGroupRolePortalActions from '@/components/admin/role/SsoGroupRolePortalActions';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { i18nKey } from '@/utils/datatable';
import { DataTable } from '@filigran/ui';
import {
  SsoGroupRolePortalsQuery,
  useSsoGroupRolePortalsQuery,
} from '@graphql/generated';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

type SsoGroupRolePortalRow =
  SsoGroupRolePortalsQuery['ssoGroupRolePortals'][number] & { id: string };

const SsoGroupRolePortalList = () => {
  const t = useTranslate();
  const { data, isError } = useSsoGroupRolePortalsQuery(portalGraphqlClient);

  const rows = useMemo<SsoGroupRolePortalRow[]>(
    () =>
      data?.ssoGroupRolePortals.map((ssoGroupRolePortal) => ({
        ...ssoGroupRolePortal,
        id: `${ssoGroupRolePortal.ssoGroup}-${ssoGroupRolePortal.rolePortal.id}`,
      })) ?? [],
    [data]
  );

  const columns: ColumnDef<SsoGroupRolePortalRow>[] = [
    {
      accessorKey: 'ssoGroup',
      id: 'ssoGroup',
      header: t('RoleListPage.SsoGroup'),
    },
    {
      accessorKey: 'rolePortal.name',
      id: 'role',
      header: t('RoleListPage.Role'),
    },
    {
      id: 'actions',
      size: 100,
      enableHiding: false,
      enableSorting: false,
      enableResizing: false,
      cell: ({ row }) => (
        <div className="flex items-center justify-end">
          <SsoGroupRolePortalActions
            ssoGroup={row.original.ssoGroup}
            rolePortal={row.original.rolePortal.name}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      {isError && (
        <div className="mb-s text-sm text-destructive">{t('Utils.Error')}</div>
      )}
      <DataTable
        columns={columns}
        data={rows}
        i18nKey={i18nKey(t)}
        tableOptions={{
          enableSorting: false,
          enableColumnResizing: false,
          enableColumnPinning: false,
          enableHiding: false,
        }}
        tableState={{ columnPinning: { right: ['actions'] } }}
        toolbar={
          <div className="flex justify-end">
            <AddSsoGroupRolePortal />
          </div>
        }
      />
    </>
  );
};

export default SsoGroupRolePortalList;
