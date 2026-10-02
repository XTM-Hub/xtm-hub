import {
  PlatformIdentifier,
  ServiceGroupName,
  UserAccountStatus,
} from '@graphql/generated';
import { isValidEmail, RolePanelConfig } from './manage-trial.const';

export type UserStatusLabel = 'Invited' | 'Expired';

export const getUserStatusLabel = (
  status: UserAccountStatus | null | undefined
): UserStatusLabel | null => {
  switch (status) {
    case UserAccountStatus.Waiting:
    case UserAccountStatus.Invited:
      return 'Invited';
    case UserAccountStatus.Expired:
      return 'Expired';
    default:
      return null;
  }
};

export const canInviteEmail = ({
  email,
  knownEmails,
  allowedDomains,
}: {
  email: string;
  knownEmails: string[];
  // null when any domain is allowed (bypass user)
  allowedDomains: string[] | null;
}) => {
  const trimmedEmail = email.trim();
  const normalizedEmail = trimmedEmail.toLowerCase();
  return (
    isValidEmail(normalizedEmail) &&
    (allowedDomains === null ||
      allowedDomains.includes(trimmedEmail.split('@')[1] ?? '')) &&
    !knownEmails.some(
      (knownEmail) => knownEmail.toLowerCase() === normalizedEmail
    )
  );
};

export const formatEmailList = (
  emails: string[],
  maxVisible: number = 3
): { visible: string; hiddenCount: number } => {
  const visible = emails.slice(0, maxVisible).join(', ');
  const hiddenCount = Math.max(emails.length - maxVisible, 0);

  return { visible, hiddenCount };
};

export const isServiceGroupName = (value: string): value is ServiceGroupName =>
  (Object.values(ServiceGroupName) as string[]).includes(value);

export interface UserPlatformGroups {
  id: string;
  groups: Array<{
    platformIdentifier: PlatformIdentifier;
    name: ServiceGroupName;
  }>;
}

export interface MixedRoleDefault {
  role?: ServiceGroupName;
  isMixed: boolean;
}

export const computeMixedRoleDefaults = (
  userIds: string[],
  users: UserPlatformGroups[],
  rolePanels: RolePanelConfig[]
): Partial<Record<PlatformIdentifier, MixedRoleDefault>> => {
  const usersById = new Map(users.map((user) => [user.id, user]));

  return rolePanels.reduce<
    Partial<Record<PlatformIdentifier, MixedRoleDefault>>
  >((accumulator, { platform, defaultRole }) => {
    const rolesForPlatform = userIds.map(
      (userId) =>
        usersById
          .get(userId)
          ?.groups.find((group) => group.platformIdentifier === platform)?.name
    );

    const isMixed = new Set(rolesForPlatform).size > 1;

    return {
      ...accumulator,
      [platform]: {
        role: isMixed ? defaultRole : rolesForPlatform[0],
        isMixed,
      },
    };
  }, {});
};
