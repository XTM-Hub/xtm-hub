import AddSolutionCategory from '@/components/admin/solution-category/AddSolutionCategory';
import EditSolutionCategory from '@/components/admin/solution-category/EditSolutionCategory';
import SolutionCategoryProductFilter from '@/components/admin/solution-category/SolutionCategoryProductFilter';
import { useSolutionCategoryListLocalstorage } from '@/components/admin/solution-category/solution-category-list-localstorage';
import {
  DataTable,
  DataTableHeadBarOptions,
  DataTableToolbar,
} from '@/components/ui/data-table';
import {
  handleSortingChange,
  mapToSortingTableValue,
  OrderingMode as SortingOrderingMode,
} from '@/components/ui/handle-sorting.utils';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { getDataTableLabels } from '@/utils/design-system/data-table';
import { formatName } from '@/utils/format/name';
import { Chip } from '@filigran/design-system';
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
        <div className="flex flex-wrap gap-1">
          {row.original.product.map((product) => (
            <Chip
              key={product}
              label={product.toUpperCase()}
            />
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
      <DataTable
        columns={columns}
        data={solutionCategories}
        isLoading={isLoading}
        {...getDataTableLabels(t)}
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
        getRowAnalyticsId={() => 'admin_solution_category_edit'}
        onClickRow={({ original }) => setSolutionCategoryEdit(original)}
        toolbar={
          <DataTableToolbar
            filters={
              <SolutionCategoryProductFilter
                selectedProduct={selectedProduct}
                onProductChange={onProductChange}
              />
            }
            actions={
              <>
                <DataTableHeadBarOptions />
                <AddSolutionCategory />
              </>
            }
          />
        }
      />
      {solutionCategoryEdit && (
        <EditSolutionCategory
          solutionCategory={solutionCategoryEdit}
          open={!!solutionCategoryEdit}
          onClose={() => setSolutionCategoryEdit(undefined)}
        />
      )}
    </>
  );
};

export default SolutionCategories;
