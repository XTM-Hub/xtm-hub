import { portalGraphqlClient } from '@/lib/graphql-client';
import { i18nKey } from '@/utils/datatable';
import { Badge, DataTable } from '@filigran/ui';
import {
  SsoGroupRolePortalsQuery,
  useSsoGroupRolePortalsQuery,
} from '@graphql/generated';
import { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

type SsoGroupRolePortalRow =
  SsoGroupRolePortalsQuery['ssoGroupRolePortals'][number] & { id: string };

const RoleList = () => {
  const t = useTranslations();
  const { data } = useSsoGroupRolePortalsQuery(portalGraphqlClient);

  const rows = useMemo<SsoGroupRolePortalRow[]>(
    () =>
      (data?.ssoGroupRolePortals ?? []).map((ssoGroupRolePortal) => ({
        ...ssoGroupRolePortal,
        id: `${ssoGroupRolePortal.ssoGroup}-${ssoGroupRolePortal.rolePortal.id}`,
      })),
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
      id: 'capabilities',
      header: t('RoleListPage.Capabilities'),
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-xs">
          {row.original.rolePortal.capabilities?.map((capability) => (
            <Badge key={capability?.id}>{capability?.name}</Badge>
          ))}
        </div>
      ),
    },
  ];

  return (
    <>
      <h1>{t('MenuLinks.Roles')}</h1>
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
      />
    </>
  );
};

export default RoleList;
