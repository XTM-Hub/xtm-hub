'use client';
import {
  getServiceCatalogTab,
  SERVICE_CATALOG_TAB_PARAM,
  ServiceCatalogTab,
} from '@/components/admin/service-catalog/service-catalog.utils';
import SolutionCategories from '@/components/admin/solution-category/SolutionCategories';
import UseCases from '@/components/admin/use-case/UseCases';
import AdminServiceList from '@/components/service/AdminServiceList';
import { useTranslate } from '@/hooks/use-translate';
import {
  analyticsId,
  type AnalyticsElementId,
} from '@/lib/analytics/analytics.ids';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@filigran/design-system';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const TAB_ANALYTICS_IDS: Record<ServiceCatalogTab, AnalyticsElementId> = {
  [ServiceCatalogTab.Services]: 'admin_services_select',
  [ServiceCatalogTab.SolutionCategories]: 'admin_solution_categories_select',
  [ServiceCatalogTab.UseCases]: 'admin_use_cases_select',
};

const TAB_TITLES: Record<ServiceCatalogTab, string> = {
  [ServiceCatalogTab.Services]: 'MenuLinks.Services',
  [ServiceCatalogTab.SolutionCategories]: 'MenuLinks.SolutionCategories',
  [ServiceCatalogTab.UseCases]: 'MenuLinks.UseCases',
};

const ServiceCatalog = () => {
  const t = useTranslate();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedTab = getServiceCatalogTab(
    searchParams.get(SERVICE_CATALOG_TAB_PARAM)
  );

  const handleTabChange = (tab: string) =>
    router.replace(`${pathname}?${SERVICE_CATALOG_TAB_PARAM}=${tab}`, {
      scroll: false,
    });

  return (
    <Tabs
      value={selectedTab}
      onValueChange={handleTabChange}>
      <TabsList>
        {Object.values(ServiceCatalogTab).map((tab) => (
          <TabsTrigger
            key={tab}
            {...analyticsId(TAB_ANALYTICS_IDS[tab])}
            value={tab}>
            {t(TAB_TITLES[tab])}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent
        value={ServiceCatalogTab.Services}
        className="pt-4">
        <AdminServiceList />
      </TabsContent>
      <TabsContent
        value={ServiceCatalogTab.SolutionCategories}
        className="pt-4">
        <SolutionCategories />
      </TabsContent>
      <TabsContent
        value={ServiceCatalogTab.UseCases}
        className="pt-4">
        <UseCases />
      </TabsContent>
    </Tabs>
  );
};

export default ServiceCatalog;
