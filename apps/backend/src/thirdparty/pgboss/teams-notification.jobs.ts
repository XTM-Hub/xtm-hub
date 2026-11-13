import type { DocumentStatus } from '../../__generated__/resolvers-types';

export interface TeamsResourceItem {
  name: string | null;
  type: string | null;
  status: DocumentStatus;
  short_description: string | null;
  link: string;
  author_email: string | null;
}

export interface TeamsNotificationPayloadMap {
  resource_in_validation: {
    library: string;
    resource: TeamsResourceItem;
  };
  resource_not_published: {
    library: string;
    resources: TeamsResourceItem[];
  };
}

export type TeamsNotificationEvent = keyof TeamsNotificationPayloadMap;

export const TEAMS_NOTIFICATION_QUEUES = {
  SEND: 'teams_notification.send',
  DEAD_LETTER: 'teams_notification.deadletter',
} as const;

export interface TeamsNotificationJobData<
  T extends TeamsNotificationEvent = TeamsNotificationEvent,
> {
  event: T;
  payload: TeamsNotificationPayloadMap[T];
}
