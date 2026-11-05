export interface AnalyticsEvents {
  ee_badge_click: {
    resource_id: string;
    resource_title: string;
    resource_type: string;
  };
}

export type AnalyticsEventName = keyof AnalyticsEvents;
