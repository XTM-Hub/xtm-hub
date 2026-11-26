const DELETION_BLOCKED_ERROR_CODES = [
  'DELETE_USER_BLOCKED_BY_TRANSFER_REQUEST',
  'DELETE_USER_BLOCKED_BY_DEPLOYMENT_REQUEST',
  'DELETE_USER_BLOCKED_BY_CANCELLATION_RECORD',
  'DELETE_USER_BLOCKED_BY_PENDING_USERS',
  'DELETE_USER_BLOCKED_BY_PLATFORM_REGISTRATION',
  'DELETE_USER_BLOCKED_BY_LAST_ORGANIZATION_MEMBER',
  'DELETE_USER_BLOCKED_BY_LINKED_DATA',
  'CANT_DELETE_YOURSELF',
  'CANT_DELETE_BUILTIN_USER',
  'CANT_REMOVE_LAST_ADMINISTRATOR',
] as const;

export type DeletionBlockedErrorCode =
  (typeof DELETION_BLOCKED_ERROR_CODES)[number];

const isDeletionBlockedErrorCode = (
  errorCode: string
): errorCode is DeletionBlockedErrorCode =>
  (DELETION_BLOCKED_ERROR_CODES as readonly string[]).includes(errorCode);

export const getDeletionBlockedReasonKey = (
  errorCode: string | undefined | null
): string | null => {
  if (!errorCode || !isDeletionBlockedErrorCode(errorCode)) {
    return null;
  }
  return `Error.Server.${errorCode}`;
};

export const canDeleteUserRow = (
  userId: string,
  currentUserId: string | undefined
): boolean => userId !== currentUserId;
