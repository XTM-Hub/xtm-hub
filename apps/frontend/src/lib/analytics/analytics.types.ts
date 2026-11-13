import {
  type ANALYTICS_LINK_TYPES,
  type FILTER_NAME_LABELS,
  type METRICS_PERIOD_LABELS,
  type ORDER_BY_LABELS,
  type ORDER_MODE_LABELS,
  type PRODUCT_LABELS,
} from '@/lib/analytics/analytics.consts';
import {
  type AnalyticsDomain,
  type AnalyticsElementId,
} from '@/lib/analytics/analytics.ids';
import { type SortableDocumentOrdering } from '@/utils/shareable-resources/shareable-resources.consts';
import {
  type SHAREABLE_RESOURCE_LIBRARY_MAPPING,
  type SHAREABLE_RESOURCE_PRODUCT_MAPPING,
  type ShareableResourceType,
} from '@/utils/shareable-resources/shareable-resources.types';
import {
  type PlatformIdentifier,
  type SaasPlatformMetricsPeriod,
} from '@graphql/generated';

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

export type AnalyticsPlatformProduct =
  (typeof PRODUCT_LABELS)[PlatformIdentifier];

type AnalyticsMetricsPeriod =
  (typeof METRICS_PERIOD_LABELS)[SaasPlatformMetricsPeriod];

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
  index?: number;
}

interface AnalyticsResourceParams extends AnalyticsLibraryParams {
  resource_id: string;
  resource_name: string;
}

export interface AnalyticsListResults extends AnalyticsLibraryParams {
  result_count: number;
  has_results: YesNo;
}

type AnalyticsFilterName =
  (typeof FILTER_NAME_LABELS)[keyof typeof FILTER_NAME_LABELS];

type AnalyticsOrderBy = (typeof ORDER_BY_LABELS)[SortableDocumentOrdering];

type AnalyticsOrderMode =
  (typeof ORDER_MODE_LABELS)[keyof typeof ORDER_MODE_LABELS];

export type AnalyticsLinkType = (typeof ANALYTICS_LINK_TYPES)[number];

export type AnalyticsDeployEligibility =
  | 'Signed out'
  | 'Can deploy'
  | 'No platform connected'
  | 'Platform version too old'
  | 'Enterprise Edition required'
  | 'Resource not deployable';

export type AnalyticsTrialState =
  | 'Personal space'
  | 'Not allowed'
  | 'Request form'
  | 'Pending'
  | 'Provisioning'
  | 'Active'
  | 'Cancelled'
  | 'Expired'
  | 'Failed';

export interface AnalyticsUserProperties {
  auth_state: 'Signed in' | 'Signed out';
  is_internal: YesNo | null;
  organization_type: 'Personal space' | 'Organization' | null;
  is_platform_admin: YesNo | null;
  organization_role: 'Administrator' | 'Member' | null;
}

export interface AnalyticsEvents {
  page_view: AnalyticsPageContext &
    AnalyticsPage & { product?: AnalyticsPlatformProduct };
  ui_click: {
    element_id: AnalyticsElementId;
    domain?: AnalyticsDomain;
    action: string;
    page_type: AnalyticsPageType;
    resource_id?: string;
    resource_name?: string;
    resource_status?: string;
    library?: string;
    use_cases?: string;
    product?: string;
    section?: string;
    epic_name?: string;
    feature_name?: string;
    link_type?: AnalyticsLinkType;
  };
  select_item: {
    item_list_name: AnalyticsLibrary | AnalyticsPageType;
    items: AnalyticsItem[];
  };
  view_item: AnalyticsResourceParams & {
    items: AnalyticsItem[];
    use_cases?: string;
    deploy_eligibility?: AnalyticsDeployEligibility;
  };
  view_item_use_case: AnalyticsResourceParams & {
    use_case: string;
  };
  view_item_list: AnalyticsListResults & {
    item_list_name: AnalyticsLibrary;
    items: AnalyticsItem[];
  };
  search: AnalyticsListResults & {
    search_term: string;
  };
  filter_apply: AnalyticsLibraryParams & {
    filter_name: AnalyticsFilterName;
    filter_value: string;
    filter_action: 'Add' | 'Remove';
  };
  sort_change: AnalyticsLibraryParams & {
    order_by: AnalyticsOrderBy;
    order_mode: AnalyticsOrderMode;
  };
  generate_lead:
    | { lead_source: 'Trial request' | 'Sales contact' }
    | {
        lead_source: 'Enterprise Edition contact';
        product: AnalyticsPlatformProduct;
      };
  sign_up: { method: 'HubSpot form' };
  feature_vote: { feature_name: string };
  view_trial: { trial_state: AnalyticsTrialState };
  view_platform_metrics: {
    product: AnalyticsPlatformProduct;
    period: AnalyticsMetricsPeriod;
  };
}

export type AnalyticsEventName = keyof AnalyticsEvents;
