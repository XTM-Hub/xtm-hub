'use client';

import Loader from '@/components/Loader';
import { ManageTrialHeader } from '@/components/service/trial-instances/xtm-platform-trial/manage-trial/ManageTrialHeader';
import { ManageTrialRoleDescriptions } from '@/components/service/trial-instances/xtm-platform-trial/manage-trial/ManageTrialRoleDescriptions';
import { ManageTrialTable } from '@/components/service/trial-instances/xtm-platform-trial/manage-trial/ManageTrialTable';
import { BreadcrumbNav } from '@/components/ui/BreadcrumbNav';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { ADMIN_MANAGE_TRIALS_PATH, APP_PATH } from '@/utils/path/constant';
import { SelectionState } from '@filigran/ui';
import {
  useBundleProductsQuery,
  useBundleUserServiceGroupsQuery,
} from '@graphql/generated';
import {
  bundleProductsKeys,
  bundleUserServiceGroupsKeys,
} from '@graphql/service-group/service-group.keys';
import { useTranslations } from 'next-intl';
import { use, useMemo, useState } from 'react';
import { ServiceXtmPlatformBundleManageUsersPageProps } from './page';

const emptySelection = (): SelectionState => ({
  selectAll: false,
  selectedIds: new Set<string>(),
  excludedIds: new Set<string>(),
});

interface ClientSectionProps {
  params: ServiceXtmPlatformBundleManageUsersPageProps['params'];
  fromDashboard: boolean;
}

const ClientSection = ({ params, fromDashboard }: ClientSectionProps) => {
  const t = useTranslations();
  const { serviceInstanceId } = use(params);
  const decodedServiceInstanceId = decodeURIComponent(serviceInstanceId);

  const [selection, setSelection] = useState<SelectionState>(emptySelection);

  const variables = { serviceInstanceId: decodedServiceInstanceId };
  const { data: queryData } = useBundleUserServiceGroupsQuery(
    portalGraphqlClient,
    variables,
    { queryKey: bundleUserServiceGroupsKeys.list(variables) }
  );
  const {
    data: productsData,
    isLoading: isProductsLoading,
    isError: isProductsError,
  } = useBundleProductsQuery(portalGraphqlClient, variables, {
    queryKey: bundleProductsKeys.list(variables),
  });

  const selectedUsers = useMemo(() => {
    const users = queryData?.bundleUserServiceGroups ?? [];

    const selectedRows = selection.selectAll
      ? users.filter((row) => !selection.excludedIds.has(row.user.id))
      : users.filter((row) => selection.selectedIds.has(row.user.id));

    return selectedRows.map((row) => ({
      id: row.user.id,
      email: row.user.email,
    }));
  }, [queryData, selection]);

  const breadcrumbs = [
    {
      label: 'MenuLinks.Home',
      href: `/${APP_PATH}`,
    },
    {
      label: 'Service.Bundle.ManageTrial.Breadcrumb.BundleName',
    },
    {
      label: 'Service.Bundle.ManageTrial.Breadcrumb.ManageUsers',
    },
  ];

  if (isProductsLoading) {
    return <Loader />;
  }

  if (isProductsError || !productsData) {
    return (
      <>
        <BreadcrumbNav value={breadcrumbs} />
        <div className="text-sm text-destructive">{t('Utils.Error')}</div>
      </>
    );
  }

  const products = productsData.bundleProducts;

  return (
    <>
      <BreadcrumbNav value={breadcrumbs} />
      <div className="flex flex-col gap-l">
        <ManageTrialHeader
          serviceInstanceId={decodedServiceInstanceId}
          products={products}
          selectedUsers={selectedUsers}
          onUsersRemoved={() => setSelection(emptySelection())}
          {...(fromDashboard && {
            backHref: ADMIN_MANAGE_TRIALS_PATH,
            backLabelKey: 'Service.Bundle.ManageTrial.BackToDashboardButton',
          })}
        />
        <ManageTrialRoleDescriptions products={products} />
        <ManageTrialTable
          serviceInstanceId={decodedServiceInstanceId}
          products={products}
          selection={selection}
          onSelectionChange={setSelection}
        />
      </div>
    </>
  );
};

export default ClientSection;
