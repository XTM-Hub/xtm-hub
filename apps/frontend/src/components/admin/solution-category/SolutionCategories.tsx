import AddSolutionCategory from '@/components/admin/solution-category/AddSolutionCategory';
import EditSolutionCategory from '@/components/admin/solution-category/EditSolutionCategory';
import SolutionCategoryProductFilter from '@/components/admin/solution-category/SolutionCategoryProductFilter';
import { useSolutionCategoryListLocalstorage } from '@/components/admin/solution-category/solution-category-list-localstorage';
import {
  handleSortingChange,
  mapToSortingTableValue,
  OrderingMode as SortingOrderingMode,
} from '@/components/ui/handle-sorting.utils';
import { useExecuteAfterAnimation } from '@/hooks/use-execute-after-animation';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { i18nKey } from '@/utils/datatable';
import { formatName } from '@/utils/format/name';
import { Badge, DataTable, DataTableHeadBarOptions } from '@filigran/ui';
import {
  FiligranProduct,
  OrderingMode,
  SolutionCategoryOrdering,
  SolutionCategoryRowFragment,
  useSolutionCategoriesListQuery,
} from '@graphql/generated';
import { solutionCategoryListKeys } from '@graphql/solution-category/solution-category-list.keys';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';

const SolutionCategories = () => {
  const t = useTranslate();
  const [solutionCategoryEdit, setSolutionCategoryEdit] = useState<
    SolutionCategoryRowFragment | undefined
  >(undefined);
  const [selectedProduct, setSelectedProduct] = useState<
    FiligranProduct | undefined
  >(undefined);
  const {
    orderBy,
    setOrderBy,
    orderMode,
    setOrderMode,
    pageSize,
    setPageSize,
    resetAll,
    removeOrder,
  } = useSolutionCategoryListLocalstorage();
  const { pagination, setPagination, cursor, onPaginationChange } =
    useTablePagination({ pageSize, setPageSize });

  const variables = useMemo(
    () => ({
      count: pagination.pageSize,
      cursor,
      orderMode: orderMode as OrderingMode,
      orderBy,
      product: selectedProduct ?? null,
    }),
    [orderBy, orderMode, pagination, cursor, selectedProduct]
  );

  const { data: queryData, isLoading } = useSolutionCategoriesListQuery(
    portalGraphqlClient,
    variables,
    {
      queryKey: solutionCategoryListKeys.list(variables),
    }
  );

  const columns: ColumnDef<SolutionCategoryRowFragment>[] = [
    {
      accessorKey: 'name',
      id: 'name',
      header: t('SolutionCategory.ListPage.Name'),
      cell: ({ row }) => (
        <span className="truncate">{formatName(row.original.name)}</span>
      ),
    },
    {
      accessorKey: 'product',
      id: 'product',
      header: t('SolutionCategory.ListPage.Product'),
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-xs">
          {row.original.product.map((product) => (
            <Badge
              key={product}
              variant="outline">
              {product.toUpperCase()}
            </Badge>
          ))}
        </div>
      ),
    },
  ];

  const solutionCategories = useMemo<SolutionCategoryRowFragment[]>(() => {
    const edges = queryData?.solutionCategories?.edges ?? [];
    return edges.map(({ node }) => node);
  }, [queryData]);
  const totalCount = queryData?.solutionCategories?.totalCount ?? 0;

  const handleRefetchData = (args: Record<string, unknown>) => {
    const nextOrderBy = args.orderBy as SolutionCategoryOrdering | undefined;
    const nextOrderMode = args.orderMode as SortingOrderingMode | undefined;

    if (nextOrderBy) {
      setOrderBy(nextOrderBy);
    }
    if (nextOrderMode) {
      setOrderMode(nextOrderMode as OrderingMode);
    }

    setPagination((previousPagination) => ({
      ...previousPagination,
      pageIndex: 0,
    }));
  };

  const onSortingChange = (updater: unknown) => {
    handleSortingChange<SolutionCategoryOrdering>({
      updater,
      orderBy,
      orderMode: orderMode as unknown as SortingOrderingMode,
      setOrderBy,
      setOrderMode: (nextOrderMode) =>
        setOrderMode(nextOrderMode as OrderingMode),
      removeOrder,
      handleRefetchData,
    });
  };

  const onProductChange = (nextProduct?: FiligranProduct) => {
    setSelectedProduct((previousSelectedProduct) => {
      if (previousSelectedProduct !== nextProduct) {
        setPagination((previousPagination) => ({
          ...previousPagination,
          pageIndex: 0,
        }));
      }
      return nextProduct;
    });
  };

  return (
    <>
      <div className="mb-s flex justify-end">
        <AddSolutionCategory />
      </div>
      <DataTable
        columns={columns}
        data={solutionCategories}
        isLoading={isLoading}
        i18nKey={i18nKey(t)}
        onResetTable={resetAll}
        tableOptions={{
          onSortingChange,
          onPaginationChange,
          manualSorting: true,
          manualPagination: true,
          rowCount: totalCount,
        }}
        tableState={{
          sorting: mapToSortingTableValue(orderBy, orderMode),
          pagination,
        }}
        onClickRow={({ original }) => setSolutionCategoryEdit(original)}
        toolbar={
          <div className="flex flex-col-reverse items-center justify-between gap-s sm:flex-row">
            <div className="w-full sm:w-1/3">
              <SolutionCategoryProductFilter
                selectedProduct={selectedProduct}
                onProductChange={onProductChange}
              />
            </div>
            <div className="flex w-full items-center justify-between gap-s sm:w-auto">
              <DataTableHeadBarOptions />
            </div>
          </div>
        }
      />
      {solutionCategoryEdit && (
        <EditSolutionCategory
          solutionCategory={solutionCategoryEdit}
          open={!!solutionCategoryEdit}
          onClose={() =>
            useExecuteAfterAnimation(() => setSolutionCategoryEdit(undefined))
          }
        />
      )}
    </>
  );
};

export default SolutionCategories;
