import { PendingUsersQuery } from '@graphql/generated';

export type PendingUser =
  PendingUsersQuery['pendingUsers']['edges'][number]['node'];

export type PendingUserAction = 'approve' | 'deny';

export interface PendingUserDialogState {
  action: PendingUserAction;
  user: PendingUser;
}
