import AddRolePortal from '@/components/admin/role/AddRolePortal';
import RolePortalActions from '@/components/admin/role/RolePortalActions';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { i18nKey } from '@/utils/datatable';
import { Chip } from '@filigran/design-system';
import { DataTable } from '@filigran/ui';
import { RolePortalsQuery, useRolePortalsQuery } from '@graphql/generated';
import { ColumnDef } from '@tanstack/react-table';

type RolePortalRow = RolePortalsQuery['rolePortals'][number];

const RolePortalCapabilitiesList = () => {
  const t = useTranslate();
  const { data, isError } = useRolePortalsQuery(portalGraphqlClient);

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
          {row.original.capabilities?.map((capability) =>
            capability ? (
              <Chip
                key={capability.id}
                label={capability.name}
              />
            ) : null
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      size: 100,
      enableHiding: false,
      enableSorting: false,
      enableResizing: false,
      cell: ({ row }) => (
        <div className="flex items-center justify-end">
          <RolePortalActions
            rolePortal={row.original.name}
            capabilities={
              row.original.capabilities?.flatMap((capability) =>
                capability ? [capability.name] : []
              ) ?? []
            }
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
        data={data?.rolePortals ?? []}
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
            <AddRolePortal />
          </div>
        }
      />
    </>
  );
};

export default RolePortalCapabilitiesList;
