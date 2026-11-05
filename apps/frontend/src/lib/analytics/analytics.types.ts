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

export interface AnalyticsEvents {
  page_view: AnalyticsPageContext & AnalyticsPage;
  ee_badge_click: {
    resource_id: string;
    resource_title: string;
    resource_type: string;
  };
}

export type AnalyticsEventName = keyof AnalyticsEvents;
