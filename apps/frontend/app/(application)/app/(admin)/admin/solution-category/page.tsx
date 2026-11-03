import {
  getServiceCatalogTabPath,
  ServiceCatalogTab,
} from '@/components/admin/service-catalog/service-catalog.utils';
import { redirect } from 'next/navigation';

const Page = () =>
  redirect(getServiceCatalogTabPath(ServiceCatalogTab.SolutionCategories));

export default Page;
