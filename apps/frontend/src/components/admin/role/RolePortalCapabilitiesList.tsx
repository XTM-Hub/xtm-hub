import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { i18nKey } from '@/utils/datatable';
import { Badge, DataTable } from '@filigran/ui';
import { RolePortalsQuery, useRolePortalsQuery } from '@graphql/generated';
import { ColumnDef } from '@tanstack/react-table';

type RolePortalRow = RolePortalsQuery['rolePortals'][number];

const RolePortalCapabilitiesList = () => {
  const t = useTranslate();
  const { data } = useRolePortalsQuery(portalGraphqlClient);

  const columns: ColumnDef<RolePortalRow>[] = [
    {
      accessorKey: 'name',
      id: 'role',
      header: t('RoleListPage.Role'),
    },
    {
      id: 'capabilities',
      header: t('RoleListPage.Capabilities'),
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-xs">
          {row.original.capabilities?.map((capability) => (
            <Badge key={capability?.id}>{capability?.name}</Badge>
          ))}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data?.rolePortals ?? []}
      i18nKey={i18nKey(t)}
      tableOptions={{
        enableSorting: false,
        enableColumnResizing: false,
        enableColumnPinning: false,
        enableHiding: false,
      }}
    />
  );
};

export default RolePortalCapabilitiesList;
