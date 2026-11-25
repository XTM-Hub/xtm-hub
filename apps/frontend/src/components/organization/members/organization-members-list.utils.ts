import type { BadgeOverflow } from '@/components/ui/BadgeOverflowCounter';
import type { OrganizationCapability } from '@graphql/generated';

// A hyphen is not allowed in a GraphQL enum value, so no capability can take this id
export const MEMBER_ROLE_BADGE_ID = 'member-role';

// One badge per capability, in the order received, as on the users page; a member holding none gets one Member badge
export const toRoleBadges = (
  capabilities: ReadonlyArray<OrganizationCapability>,
  memberLabel: string
): BadgeOverflow[] =>
  capabilities.length > 0
    ? capabilities.map((capability) => ({ id: capability, name: capability }))
    : [{ id: MEMBER_ROLE_BADGE_ID, name: memberLabel }];
