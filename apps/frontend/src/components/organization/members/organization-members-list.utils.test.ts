import { OrganizationCapability } from '@graphql/generated';
import { describe, expect, it } from 'vitest';
import {
  MEMBER_ROLE_BADGE_ID,
  toRoleBadges,
} from './organization-members-list.utils';

const MEMBER_LABEL = 'Member';

describe('toRoleBadges', () => {
  it.each([
    {
      description: 'no capability',
      capabilities: [],
      expected: [{ id: MEMBER_ROLE_BADGE_ID, name: MEMBER_LABEL }],
    },
    {
      description: 'one capability',
      capabilities: [OrganizationCapability.AdministrateOrganization],
      expected: [
        {
          id: OrganizationCapability.AdministrateOrganization,
          name: OrganizationCapability.AdministrateOrganization,
        },
      ],
    },
    {
      description: 'several capabilities out of alphabetical order',
      capabilities: [
        OrganizationCapability.ManageSubscription,
        OrganizationCapability.AdministrateOrganization,
        OrganizationCapability.ManageAccess,
      ],
      expected: [
        {
          id: OrganizationCapability.ManageSubscription,
          name: OrganizationCapability.ManageSubscription,
        },
        {
          id: OrganizationCapability.AdministrateOrganization,
          name: OrganizationCapability.AdministrateOrganization,
        },
        {
          id: OrganizationCapability.ManageAccess,
          name: OrganizationCapability.ManageAccess,
        },
      ],
    },
  ])(
    'should return the role badges of the users page when the member holds $description',
    ({ capabilities, expected }) => {
      // Given / When
      const badges = toRoleBadges(capabilities, MEMBER_LABEL);

      // Then
      expect(badges).toEqual(expected);
    }
  );
});
