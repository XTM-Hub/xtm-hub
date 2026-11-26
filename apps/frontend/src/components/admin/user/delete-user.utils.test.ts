import {
  canDeleteUserRow,
  getDeletionBlockedReasonKey,
} from '@/components/admin/user/delete-user.utils';
import { describe, expect, it } from 'vitest';

describe('getDeletionBlockedReasonKey', () => {
  it.each`
    errorCode                                            | expected                                                          | description
    ${'DELETE_USER_BLOCKED_BY_TRANSFER_REQUEST'}         | ${'Error.Server.DELETE_USER_BLOCKED_BY_TRANSFER_REQUEST'}         | ${'a pending personal space transfer'}
    ${'DELETE_USER_BLOCKED_BY_DEPLOYMENT_REQUEST'}       | ${'Error.Server.DELETE_USER_BLOCKED_BY_DEPLOYMENT_REQUEST'}       | ${'linked deployment requests'}
    ${'DELETE_USER_BLOCKED_BY_PENDING_USERS'}            | ${'Error.Server.DELETE_USER_BLOCKED_BY_PENDING_USERS'}            | ${'an organization with pending users'}
    ${'DELETE_USER_BLOCKED_BY_PLATFORM_REGISTRATION'}    | ${'Error.Server.DELETE_USER_BLOCKED_BY_PLATFORM_REGISTRATION'}    | ${'a platform the user registered'}
    ${'DELETE_USER_BLOCKED_BY_LAST_ORGANIZATION_MEMBER'} | ${'Error.Server.DELETE_USER_BLOCKED_BY_LAST_ORGANIZATION_MEMBER'} | ${'being the last member of an organization'}
    ${'DELETE_USER_BLOCKED_BY_LINKED_DATA'}              | ${'Error.Server.DELETE_USER_BLOCKED_BY_LINKED_DATA'}              | ${'other linked data'}
    ${'CANT_DELETE_YOURSELF'}                            | ${'Error.Server.CANT_DELETE_YOURSELF'}                            | ${'self deletion'}
    ${'CANT_DELETE_BUILTIN_USER'}                        | ${'Error.Server.CANT_DELETE_BUILTIN_USER'}                        | ${'a builtin user'}
    ${'CANT_REMOVE_LAST_ADMINISTRATOR'}                  | ${'Error.Server.CANT_REMOVE_LAST_ADMINISTRATOR'}                  | ${'the last administrator of an organization'}
    ${'DELETE_USER_ERROR'}                               | ${null}                                                           | ${'a generic backend failure'}
    ${'USER_NOT_FOUND'}                                  | ${null}                                                           | ${'a missing user'}
    ${'DELETE_ORGANIZATION_REQUIRES_SINGLE_USER'}        | ${null}                                                           | ${'an organization-scoped guard'}
    ${''}                                                | ${null}                                                           | ${'an empty error code'}
    ${undefined}                                         | ${null}                                                           | ${'a missing error code'}
    ${null}                                              | ${null}                                                           | ${'a null error code'}
  `(
    'should map "$errorCode" to $expected ($description)',
    ({ errorCode, expected }) => {
      expect(getDeletionBlockedReasonKey(errorCode)).toBe(expected);
    }
  );
});

describe('canDeleteUserRow', () => {
  it.each`
    userId          | currentUserId | expected | description
    ${'other-user'} | ${'me-id'}    | ${true}  | ${'a regular user that is not the current one'}
    ${'me-id'}      | ${'me-id'}    | ${false} | ${'the currently signed in user'}
    ${'me-id'}      | ${undefined}  | ${true}  | ${'no current user resolved yet'}
  `(
    'should return $expected for $description',
    ({ userId, currentUserId, expected }) => {
      expect(canDeleteUserRow(userId, currentUserId)).toBe(expected);
    }
  );
});
