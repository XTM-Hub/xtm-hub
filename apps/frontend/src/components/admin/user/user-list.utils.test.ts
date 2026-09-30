import {
  canResendInvite,
  getOrganizationCapabilities,
  type InvitedUser,
  toAdminResendInviteInput,
  toResendInviteInput,
} from '@/components/admin/user/user-list.utils';
import { describe, expect, it } from 'vitest';

type OrganizationCapabilities = NonNullable<
  InvitedUser['organization_capabilities']
>[number];

const USER_EMAIL = 'invited@filigran.io';
const USER_FIRST_NAME = 'Jane';
const USER_LAST_NAME = 'Doe';
const SELECTED_ORGANIZATION_ID = 'selected-organization';
const OTHER_ORGANIZATION_ID = 'other-organization';
const PERSONAL_SPACE_ID = 'personal-space';
const SELECTED_ORGANIZATION_CAPABILITY = 'MANAGE_ACCESS';
const OTHER_ORGANIZATION_CAPABILITY = 'MANAGE_SUBSCRIPTION';

const makeOrganizationCapabilities = (
  organizationId: string,
  capabilities: OrganizationCapabilities['capabilities'],
  personalSpace = false
): OrganizationCapabilities => ({
  organization: { id: organizationId, personal_space: personalSpace },
  capabilities,
});

const selectedOrganization = makeOrganizationCapabilities(
  SELECTED_ORGANIZATION_ID,
  [SELECTED_ORGANIZATION_CAPABILITY]
);
const otherOrganization = makeOrganizationCapabilities(OTHER_ORGANIZATION_ID, [
  OTHER_ORGANIZATION_CAPABILITY,
]);
const personalSpace = makeOrganizationCapabilities(
  PERSONAL_SPACE_ID,
  [SELECTED_ORGANIZATION_CAPABILITY],
  true
);

const makeUser = (overrides: Partial<InvitedUser> = {}): InvitedUser => ({
  email: USER_EMAIL,
  first_name: USER_FIRST_NAME,
  last_name: USER_LAST_NAME,
  organization_capabilities: [],
  ...overrides,
});

describe('canResendInvite', () => {
  it('should allow a resend when the invitation has expired', () => {
    // Given an expired invitation
    // When checking whether it can be resent
    const result = canResendInvite('expired');

    // Then it can
    expect(result).toBe(true);
  });

  it.each([['waiting'], ['invited'], [null], [undefined]])(
    'should not allow a resend when the invitation status is %s',
    (status) => {
      // Given an invitation still pending, or no invitation at all
      // When checking whether it can be resent
      const result = canResendInvite(status);

      // Then it cannot
      expect(result).toBe(false);
    }
  );
});

describe('getOrganizationCapabilities', () => {
  it('should return the capabilities of the requested organization only', () => {
    // Given capabilities in two organizations
    const organizationCapabilities = [otherOrganization, selectedOrganization];

    // When reading those of the selected organization
    const result = getOrganizationCapabilities(
      organizationCapabilities,
      SELECTED_ORGANIZATION_ID
    );

    // Then only the selected organization's capabilities are returned
    expect(result).toEqual([SELECTED_ORGANIZATION_CAPABILITY]);
  });

  it.each([
    [
      'the user has no organization capabilities',
      null,
      SELECTED_ORGANIZATION_ID,
    ],
    [
      'the user is not in the requested organization',
      [otherOrganization],
      SELECTED_ORGANIZATION_ID,
    ],
    ['no organization is requested', [selectedOrganization], undefined],
    [
      'the organization has no capabilities',
      [makeOrganizationCapabilities(SELECTED_ORGANIZATION_ID, null)],
      SELECTED_ORGANIZATION_ID,
    ],
  ])(
    'should return no capabilities when %s',
    (_context, organizationCapabilities, organizationId) => {
      // Given no capability matching the requested organization
      // When reading the organization capabilities
      const result = getOrganizationCapabilities(
        organizationCapabilities,
        organizationId
      );

      // Then the list is empty
      expect(result).toEqual([]);
    }
  );
});

describe('toResendInviteInput', () => {
  it('should build the addUser input from the email and the selected organization capabilities', () => {
    // Given a user with capabilities in several organizations
    const user = makeUser({
      organization_capabilities: [selectedOrganization, otherOrganization],
    });

    // When building the org-admin resend input
    const result = toResendInviteInput(user, SELECTED_ORGANIZATION_ID);

    // Then it only carries the selected organization capabilities
    expect(result).toEqual({
      email: USER_EMAIL,
      password: null,
      capabilities: [SELECTED_ORGANIZATION_CAPABILITY],
    });
  });
});

describe('toAdminResendInviteInput', () => {
  it('should build the adminAddUser input with the capabilities of every non-personal organization', () => {
    // Given a user in two organizations and a personal space
    const user = makeUser({
      organization_capabilities: [
        selectedOrganization,
        personalSpace,
        otherOrganization,
      ],
    });

    // When building the admin resend input
    const result = toAdminResendInviteInput(user);

    // Then the personal space is left out
    expect(result).toEqual({
      email: USER_EMAIL,
      password: null,
      first_name: USER_FIRST_NAME,
      last_name: USER_LAST_NAME,
      organization_capabilities: [
        {
          organization_id: SELECTED_ORGANIZATION_ID,
          capabilities: [SELECTED_ORGANIZATION_CAPABILITY],
        },
        {
          organization_id: OTHER_ORGANIZATION_ID,
          capabilities: [OTHER_ORGANIZATION_CAPABILITY],
        },
      ],
    });
  });

  it.each([[null], [undefined]])(
    'should send null names when they are %s',
    (name) => {
      // Given a user without first and last name
      const user = makeUser({ first_name: name, last_name: name });

      // When building the admin resend input
      const result = toAdminResendInviteInput(user);

      // Then both names are sent as null, as the GraphQL input expects
      expect(result).toMatchObject({ first_name: null, last_name: null });
    }
  );

  it('should send an empty capability list for an organization without capabilities', () => {
    // Given a user in an organization with no capabilities
    const user = makeUser({
      organization_capabilities: [
        makeOrganizationCapabilities(SELECTED_ORGANIZATION_ID, null),
      ],
    });

    // When building the admin resend input
    const result = toAdminResendInviteInput(user);

    // Then that organization is sent with an empty capability list
    expect(result.organization_capabilities).toEqual([
      { organization_id: SELECTED_ORGANIZATION_ID, capabilities: [] },
    ]);
  });

  it('should send no organization capabilities when the user has none', () => {
    // Given a user without organization capabilities
    const user = makeUser({ organization_capabilities: null });

    // When building the admin resend input
    const result = toAdminResendInviteInput(user);

    // Then no organization is sent
    expect(result.organization_capabilities).toEqual([]);
  });
});
