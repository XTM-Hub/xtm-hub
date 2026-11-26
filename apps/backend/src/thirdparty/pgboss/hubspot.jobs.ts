export type HubspotWebhookType = 'login' | 'reachOutSales' | 'inviteUser';

export interface HubspotLoginPayload {
  email: string | null;
  first_login: boolean;
  last_login: Date | null;
  is_admin: boolean;
}

export interface HubspotReachOutSalesPayload {
  email: string | null;
  firstname: string | null | undefined;
  lastname: string | null | undefined;
  company: string;
  message: string;
}

export interface HubspotInviteUserPayload {
  email: string;
  first_name: string | null;
  last_name: string | null;
  inviter_email: string;
}

export interface HubspotPayloadMap {
  login: HubspotLoginPayload;
  reachOutSales: HubspotReachOutSalesPayload;
  inviteUser: HubspotInviteUserPayload;
}

export const HUBSPOT_QUEUES = {
  LOGIN: 'hubspot.login',
  REACH_OUT_SALES: 'hubspot.reach_out_sales',
  INVITE_USER: 'hubspot.invite_user',
  DEAD_LETTER: 'hubspot.deadletter',
} as const;

export type HubspotQueueName =
  | typeof HUBSPOT_QUEUES.LOGIN
  | typeof HUBSPOT_QUEUES.REACH_OUT_SALES
  | typeof HUBSPOT_QUEUES.INVITE_USER;

export const HUBSPOT_TYPE_TO_QUEUE = {
  login: HUBSPOT_QUEUES.LOGIN,
  reachOutSales: HUBSPOT_QUEUES.REACH_OUT_SALES,
  inviteUser: HUBSPOT_QUEUES.INVITE_USER,
} as const satisfies Record<HubspotWebhookType, HubspotQueueName>;

export interface HubspotJobData<
  T extends HubspotWebhookType = HubspotWebhookType,
> {
  type: T;
  payload: HubspotPayloadMap[T];
}
