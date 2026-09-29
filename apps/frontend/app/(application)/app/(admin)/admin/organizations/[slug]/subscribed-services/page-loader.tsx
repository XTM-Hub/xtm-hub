'use client';

import OrganizationSubscribedServicesSlug from '@/components/organization/[slug]/subscribed-services/OrganizationSubscribedServices';
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

// Component interface
interface PreloaderProps {
  id: string;
}

// Component
const PageLoader = ({ id }: PreloaderProps) => {
  const t = useTranslate();
  const { data: organizationData } =
    useOrganizationSubscribedServicesBreadcrumbQuery(portalGraphqlClient, {
      id,
    });
  const organizationLabel = organizationData?.organization?.name ?? id;

  const breadcrumbValue = useMemo(() => {
    return [
      ...baseBreadcrumbValue,
      { label: organizationLabel, original: true },
      { label: 'Service.SubscribedServices' },
    ];
  }, [organizationLabel]);

  return (
    <>
      <BreadcrumbNav value={breadcrumbValue} />
      <h1 className="sr-only">{t('Service.SubscribedServices')}</h1>
      <OrganizationSubscribedServicesSlug organizationId={id} />
    </>
  );
};

// Component export
export default PageLoader;
