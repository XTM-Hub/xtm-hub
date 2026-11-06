import {
  type AnalyticsDomain,
  type AnalyticsElementId,
} from '@/lib/analytics/analytics.ids';
import {
  type SHAREABLE_RESOURCE_LIBRARY_MAPPING,
  type SHAREABLE_RESOURCE_PRODUCT_MAPPING,
  type ShareableResourceType,
} from '@/utils/shareable-resources/shareable-resources.types';

export type AnalyticsPageType =
  | 'Home'
  | 'Library'
  | 'Resource page'
  | 'Roadmap'
  | 'Trial'
  | 'Trial guide'
  | 'CSM board'
  | 'Platform details'
  | 'Admin'
  | 'Profile'
  | 'Other';

export interface AnalyticsPage {
  page_type: AnalyticsPageType;
  page_template: string;
}

export interface AnalyticsPageContext {
  page_location: string;
  page_referrer: string;
  page_title: string;
  content_group: AnalyticsPageType;
}

type YesNo = 'Yes' | 'No';

type AnalyticsLibrary =
  (typeof SHAREABLE_RESOURCE_LIBRARY_MAPPING)[ShareableResourceType];

type AnalyticsProduct =
  (typeof SHAREABLE_RESOURCE_PRODUCT_MAPPING)[ShareableResourceType];

export interface AnalyticsResource {
  id: string;
  name: string | null | undefined;
}

export interface AnalyticsLibraryParams {
  library: AnalyticsLibrary;
  product: AnalyticsProduct;
}

export interface AnalyticsItem {
  item_id: string;
  item_name: string;
  item_category: AnalyticsLibrary;
  item_brand: AnalyticsProduct;
  index: number;
}

interface AnalyticsResourceParams extends AnalyticsLibraryParams {
  resource_id: string;
  resource_name: string;
}

export type AnalyticsDeployEligibility =
  | 'Signed out'
  | 'Can deploy'
  | 'No platform connected'
  | 'Platform version too old'
  | 'Enterprise Edition required'
  | 'Resource not deployable';

export interface AnalyticsUserProperties {
  auth_state: 'Signed in' | 'Signed out';
  is_internal: YesNo | null;
  organization_type: 'Personal space' | 'Organization' | null;
  is_platform_admin: YesNo | null;
  organization_role: 'Administrator' | 'Member' | null;
}

export interface AnalyticsEvents {
  page_view: AnalyticsPageContext & AnalyticsPage;
  ui_click: {
    element_id: AnalyticsElementId;
    domain?: AnalyticsDomain;
    action: string;
    page_type: AnalyticsPageType;
    resource_id?: string;
    resource_name?: string;
    library?: string;
    use_cases?: string;
    product?: string;
    section?: string;
    epic_name?: string;
    feature_name?: string;
  };
  ee_badge_click: {
    resource_id: string;
    resource_title: string;
    resource_type: string;
  };
  view_item: AnalyticsResourceParams & {
    items: AnalyticsItem[];
    use_cases?: string;
    deploy_eligibility?: AnalyticsDeployEligibility;
  };
  view_item_use_case: AnalyticsResourceParams & {
    use_case: string;
  };
}

export type AnalyticsEventName = keyof AnalyticsEvents;
