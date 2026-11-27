'use client';

import {
  ORGANIZATION_MEMBERS_DEFAULT_PAGE_SIZE,
  ORGANIZATION_MEMBERS_PAGE_SIZE_OPTIONS,
  normalizeOrganizationMembersPageSize,
  useOrganizationMembersListLocalstorage,
} from '@/components/organization/members/organization-members-list-localstorage';
import { toRoleBadges } from '@/components/organization/members/organization-members-list.utils';
import BadgeOverflowCounter from '@/components/ui/BadgeOverflowCounter';
import {
  DataTable,
  DataTableHeadBarOptions,
  DataTableToolbar,
} from '@/components/ui/data-table';
import { useDebouncedSearch } from '@/hooks/use-debounced-search';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  retryUnlessUnauthenticated,
  throwOnFirstLoadError,
} from '@/lib/query-client';
import { getDataTableLabels } from '@/utils/design-system/data-table';
import { SearchField } from '@filigran/design-system';
import {
  useOrganizationMembersQuery,
  type OrganizationMembersQuery,
  type OrganizationMembersQueryVariables,
} from '@graphql/generated';
import { keepPreviousData } from '@tanstack/react-query';
import {
  type ColumnDef,
  type TableOptions,
  type TableState,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';

type OrganizationMemberRow =
  OrganizationMembersQuery['organizationMembers']['edges'][number]['node'];

// NOT_FOUND for an id that is not a uuid or an organization the caller cannot read, ORGANIZATION_NOT_FOUND for an unknown one
const ORGANIZATION_NOT_FOUND_ERRORS = ['NOT_FOUND', 'ORGANIZATION_NOT_FOUND'];

const isOrganizationNotFound = (error: unknown) =>
  error instanceof Error &&
  ORGANIZATION_NOT_FOUND_ERRORS.includes(error.message);

export const OrganizationMembersNotFound = () => {
  const t = useTranslate();
  return (
    <p className="text-default-secondary">
      {t('Error.Server.ORGANIZATION_NOT_FOUND')}
    </p>
  );
};

interface OrganizationMembersListProps {
  organizationId: string;
}

export const OrganizationMembersList = ({
  organizationId,
}: OrganizationMembersListProps) => {
  const t = useTranslate();
  const columns = useMemo<ColumnDef<OrganizationMemberRow>[]>(
    () => [
      {
        id: 'email',
        accessorFn: (row) => row.email,
        // -1: the email takes what the other columns leave, so it stays readable
        size: -1,
        header: t('UserListPage.Email'),
        cell: ({ row }) => (
          <span className="truncate">{row.original.email}</span>
        ),
      },
      {
        id: 'first_name',
        accessorFn: (row) => row.first_name,
        header: t('UserListPage.FirstName'),
        cell: ({ row }) => (
          <span className="truncate">{row.original.first_name}</span>
        ),
      },
      {
        id: 'last_name',
        accessorFn: (row) => row.last_name,
        header: t('UserListPage.LastName'),
        cell: ({ row }) => (
          <span className="truncate">{row.original.last_name}</span>
        ),
      },
      {
        id: 'roles',
        accessorFn: (row) => row.capabilities,
        header: t('UserListPage.Roles'),
        cell: ({ row }) => (
          <BadgeOverflowCounter
            badges={toRoleBadges(
              row.original.capabilities,
              t('UserListPage.Member')
            )}
          />
        ),
      },
    ],
    [t]
  );

  const {
    pageSize,
    setPageSize,
    columnOrder,
    setColumnOrder,
    columnVisibility,
    setColumnVisibility,
    resetAll,
  } = useOrganizationMembersListLocalstorage(columns);
  const [searchTerm, setSearchTerm] = useState('');

  const { pagination, cursor, setPagination, onPaginationChange } =
    useTablePagination({
      pageSize,
      setPageSize,
      normalizePageSize: normalizeOrganizationMembersPageSize,
    });

  // The pagination state outlives the storage: it goes back to its defaults with it
  const resetTable = () => {
    resetAll();
    setPagination({
      pageIndex: 0,
      pageSize: ORGANIZATION_MEMBERS_DEFAULT_PAGE_SIZE,
    });
  };

  const applySearch = (term: string) => {
    setSearchTerm(term);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };
  const searchHandlers = useDebouncedSearch({
    apply: applySearch,
    appliedTerm: searchTerm,
  });

  const variables = useMemo<OrganizationMembersQueryVariables>(
    () => ({
      organizationId,
      first: pagination.pageSize,
      after: cursor,
      searchTerm: searchTerm || null,
    }),
    [organizationId, pagination.pageSize, cursor, searchTerm]
  );

  const { data, error, isLoading, isPlaceholderData } =
    useOrganizationMembersQuery(portalGraphqlClient, variables, {
      // A page, page size or search change keeps the current rows until its results arrive
      placeholderData: keepPreviousData,
      // Asking again cannot make a missing organization appear
      retry: (failureCount, queryError) =>
        !isOrganizationNotFound(queryError) &&
        retryUnlessUnauthenticated(failureCount, queryError),
      // A missing organization shows its message; any other failed first load reaches the error page
      throwOnError: (queryError, query) =>
        !isOrganizationNotFound(queryError) &&
        throwOnFirstLoadError(queryError, query),
      // As the users list: a page or search already in the cache reloads, coming back to the browser tab does not
      staleTime: 0,
      refetchOnWindowFocus: false,
    });

  const rows = useMemo<OrganizationMemberRow[]>(
    () => (data?.organizationMembers.edges ?? []).map(({ node }) => node),
    [data]
  );

  if (isOrganizationNotFound(error)) {
    return <OrganizationMembersNotFound />;
  }

  // Only for a settled answer: the rows kept on screen during a new search are not its result
  const hasNoMembers =
    !isLoading &&
    !isPlaceholderData &&
    data?.organizationMembers.totalCount === 0;

  const tableState: Partial<TableState> = {
    pagination,
    columnOrder,
    columnVisibility,
  };
  const tableOptions: Partial<TableOptions<OrganizationMemberRow>> = {
    manualPagination: true,
    rowCount: data?.organizationMembers.totalCount ?? 0,
    onPaginationChange,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    // organizationMembers takes no ordering
    enableSorting: false,
  };

  return (
    <>
      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        {...getDataTableLabels(t)}
        pageSizeOptions={ORGANIZATION_MEMBERS_PAGE_SIZE_OPTIONS}
        onResetTable={resetTable}
        tableState={tableState}
        tableOptions={tableOptions}
        toolbar={
          <DataTableToolbar
            search={
              <SearchField
                fullWidth
                aria-label={t('UserActions.SearchUser')}
                placeholder={t('UserActions.SearchUser')}
                clearLabel={t('DesignSystem.SearchField.Clear')}
                onChange={searchHandlers.onChange}
                onClear={searchHandlers.onClear}
              />
            }
            actions={<DataTableHeadBarOptions />}
          />
        }
      />
      {hasNoMembers && (
        <p className="mt-4 text-center text-sm text-default-secondary">
          {t('UserListPage.NoUsers')}
        </p>
      )}
    </>
  );
};
