import AddUseCase from '@/components/admin/use-case/AddUseCase';
import EditUseCase from '@/components/admin/use-case/EditUseCase';
import { DataTable, DataTableToolbar } from '@/components/ui/data-table';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { getDataTableLabels } from '@/utils/design-system/data-table';
import {
  Chip,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@filigran/design-system';
import {
  FiligranProduct,
  OrderingMode,
  UseCaseOrdering,
  UseCaseRowFragment,
  useUseCasesListQuery,
} from '@graphql/generated';
import { useCaseListKeys } from '@graphql/use-case/use-case-list.keys';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';

const UseCases = () => {
  const t = useTranslate();
  const [useCaseEdit, setUseCaseEdit] = useState<
    UseCaseRowFragment | undefined
  >(undefined);
  const [selectedProduct, setSelectedProduct] = useState<
    FiligranProduct | undefined
  >(undefined);

  const useCasesListVariables = useMemo(
    () => ({
      count: 100,
      orderMode: OrderingMode.Asc,
      orderBy: UseCaseOrdering.Name,
      documentType: null,
      product: selectedProduct ?? null,
    }),
    [selectedProduct]
  );

  const { data: queryData, isError } = useUseCasesListQuery(
    portalGraphqlClient,
    useCasesListVariables,
    {
      queryKey: useCaseListKeys.list(useCasesListVariables),
    }
  );

  const columns: ColumnDef<UseCaseRowFragment>[] = [
    {
      accessorKey: 'name',
      id: 'name',
      header: t('UseCaseListPage.Name'),
      cell: ({ row }) => {
        return (
          <Chip
            label={row.original.name}
            color={row.original.color}
          />
        );
      },
    },
    {
      accessorKey: 'product',
      id: 'product',
      header: t('UseCaseListPage.Product'),
      cell: ({ row }) => {
        return (
          <div className="flex flex-wrap gap-1">
            {row.original.product.map((product) => (
              <Chip
                key={product}
                label={product.toUpperCase()}
              />
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: 'color',
      id: 'color',
      header: t('UseCaseListPage.Color'),
      cell: ({ row }) => {
        return <span className="truncate">{row.original.color}</span>;
      },
    },
  ];

  const useCasesData = useMemo<UseCaseRowFragment[]>(() => {
    const edges = queryData?.useCases?.edges ?? [];
    return edges.map(({ node }) => node);
  }, [queryData]);

  return (
    <>
      {isError && (
        <div className="mb-2 text-sm text-feedback-error-primary">
          {t('Utils.Error')}
        </div>
      )}
      <DataTable
        columns={columns}
        data={useCasesData}
        {...getDataTableLabels(t)}
        tableOptions={{
          enableSorting: false,
          enableColumnResizing: false,
          enableColumnPinning: false,
          enableHiding: false,
        }}
        getRowAnalyticsId={() => 'admin_use_case_edit'}
        onClickRow={({ original }) => setUseCaseEdit(original)}
        toolbar={
          <DataTableToolbar
            filters={
              <Select
                value={selectedProduct ?? 'all'}
                onValueChange={(value) =>
                  setSelectedProduct(
                    value === 'all' ? undefined : (value as FiligranProduct)
                  )
                }>
                <SelectTrigger
                  {...analyticsId('admin_use_case_products_open')}
                  aria-label={t('UseCaseListPage.Product')}
                  className="w-full">
                  <SelectValue placeholder={t('UseCaseListPage.Product')} />
                </SelectTrigger>
                <SelectContent className="layer-1">
                  <SelectItem value="all">
                    {t('UseCaseListPage.AllProducts')}
                  </SelectItem>
                  {Object.values(FiligranProduct).map((product) => (
                    <SelectItem
                      key={product}
                      value={product}>
                      {product.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
            actions={<AddUseCase />}
          />
        }
      />
      {useCaseEdit && (
        <EditUseCase
          useCase={useCaseEdit}
          open={!!useCaseEdit}
          onClose={() => setUseCaseEdit(undefined)}
        />
      )}
    </>
  );
};

export default UseCases;
