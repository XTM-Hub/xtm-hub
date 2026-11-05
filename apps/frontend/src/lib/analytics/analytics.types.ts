import {
  type AnalyticsDomain,
  type AnalyticsElementId,
} from '@/lib/analytics/analytics.ids';

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
}

export type AnalyticsEventName = keyof AnalyticsEvents;
