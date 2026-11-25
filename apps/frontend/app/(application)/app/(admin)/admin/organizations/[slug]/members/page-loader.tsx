'use client';

import {
  OrganizationMembersList,
  OrganizationMembersNotFound,
} from '@/components/organization/members/OrganizationMembersList';
import { BreadcrumbNav } from '@/components/ui/BreadcrumbNav';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { APP_PATH } from '@/utils/path/constant';
import { useOrganizationSubscribedServicesBreadcrumbQuery } from '@graphql/generated';
import { useMemo } from 'react';

const baseBreadcrumbValue = [
  {
    label: 'MenuLinks.Settings',
  },
  {
    label: 'MenuLinks.Organization',
    href: `/${APP_PATH}/admin/organizations`,
  },
];

interface PreloaderProps {
  id: string;
}

const PageLoader = ({ id }: PreloaderProps) => {
  const t = useTranslate();
  const { data: organizationData } =
    useOrganizationSubscribedServicesBreadcrumbQuery(portalGraphqlClient, {
      id,
    });
  const organizationName = organizationData?.organization?.name;
  // For a caller without BYPASS, organization(id) answers null for a global id of another type, which the list refuses at coercion
  const isOrganizationMissing =
    organizationData !== undefined && !organizationData.organization;

  // The name is left out until it is known, so the encoded id never shows
  const breadcrumbValue = useMemo(
    () =>
      organizationName
        ? [...baseBreadcrumbValue, { label: organizationName, original: true }]
        : baseBreadcrumbValue,
    [organizationName]
  );

  return (
    <>
      <BreadcrumbNav value={breadcrumbValue} />
      <h1 className="sr-only">{t('UserListPage.Members')}</h1>
      {isOrganizationMissing ? (
        <OrganizationMembersNotFound />
      ) : (
        <OrganizationMembersList organizationId={id} />
      )}
    </>
  );
};

export default PageLoader;
