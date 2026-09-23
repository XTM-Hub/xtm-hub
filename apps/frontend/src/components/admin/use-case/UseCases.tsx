import AddUseCase from '@/components/admin/use-case/AddUseCase';
import EditUseCase from '@/components/admin/use-case/EditUseCase';
import { useExecuteAfterAnimation } from '@/hooks/use-execute-after-animation';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { i18nKey } from '@/utils/datatable';
import {
  Badge,
  DataTable,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@filigran/ui';
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
          <Badge
            variant="outline"
            color={row.original.color}>
            {row.original.name}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'product',
      id: 'product',
      header: t('UseCaseListPage.Product'),
      cell: ({ row }) => {
        return (
          <div className="flex flex-wrap gap-xs">
            {row.original.product.map((product) => (
              <Badge
                key={product}
                variant="outline">
                {product.toUpperCase()}
              </Badge>
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
        <div className="mb-s text-sm text-destructive">{t('Utils.Error')}</div>
      )}
      <DataTable
        columns={columns}
        data={useCasesData}
        i18nKey={i18nKey(t)}
        tableOptions={{
          enableSorting: false,
          enableColumnResizing: false,
          enableColumnPinning: false,
          enableHiding: false,
        }}
        onClickRow={({ original }) => setUseCaseEdit(original)}
        toolbar={
          <div className="flex flex-col-reverse items-center justify-between gap-s sm:flex-row">
            <div />
            <div className="flex w-full items-center justify-between gap-s sm:w-auto">
              <Select
                value={selectedProduct ?? 'all'}
                onValueChange={(value) =>
                  setSelectedProduct(
                    value === 'all' ? undefined : (value as FiligranProduct)
                  )
                }>
                <SelectTrigger className="w-45">
                  <SelectValue placeholder={t('UseCaseListPage.Product')} />
                </SelectTrigger>
                <SelectContent>
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
              <AddUseCase />
            </div>
          </div>
        }
      />
      {useCaseEdit && (
        <EditUseCase
          useCase={useCaseEdit}
          open={!!useCaseEdit}
          onClose={() =>
            useExecuteAfterAnimation(() => setUseCaseEdit(undefined))
          }
        />
      )}
    </>
  );
};

export default UseCases;
