import {
  type AddUserInput,
  type AdminAddUserInput,
  UserAccountStatus,
} from '@graphql/generated';

// Structural types, so these helpers work with Relay and react-query user data alike
type UserOrganizationCapabilities =
  | ReadonlyArray<{
      organization: { id: string; personal_space: boolean };
      capabilities?: ReadonlyArray<string> | null;
    }>
  | null
  | undefined;

export type InvitedUser = {
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  organization_capabilities?: UserOrganizationCapabilities;
};

// Per the trial-invite spec, only an expired invitation can be resent
export const canResendInvite = (status: string | null | undefined) =>
  status === UserAccountStatus.Expired;

export const getOrganizationCapabilities = (
  organizationCapabilities: UserOrganizationCapabilities,
  organizationId: string | undefined
) =>
  organizationCapabilities?.find(
    ({ organization }) => organization.id === organizationId
  )?.capabilities ?? [];

export const toResendInviteInput = (
  user: InvitedUser,
  organizationId: string | undefined
): AddUserInput => ({
  email: user.email,
  password: null,
  capabilities: [
    ...getOrganizationCapabilities(
      user.organization_capabilities,
      organizationId
    ),
  ],
});

export const toAdminResendInviteInput = (
  user: InvitedUser
): AdminAddUserInput => ({
  email: user.email,
  password: null,
  first_name: user.first_name ?? null,
  last_name: user.last_name ?? null,
  organization_capabilities: (user.organization_capabilities ?? [])
    .filter(({ organization }) => !organization.personal_space)
    .map(({ organization, capabilities }) => ({
      organization_id: organization.id,
      capabilities: [...(capabilities ?? [])],
    })),
});
