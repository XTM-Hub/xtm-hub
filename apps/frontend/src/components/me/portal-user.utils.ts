import type { CurrentUserFragment } from '@graphql/generated';

type RequiredList = 'capabilities' | 'organizations';

export type PortalUser = Omit<
  CurrentUserFragment,
  RequiredList | 'selected_organization_id'
> & {
  [Field in RequiredList]: NonNullable<CurrentUserFragment[Field]>;
} & { selected_organization_id: string };

const requireField = <Field extends keyof CurrentUserFragment>(
  user: CurrentUserFragment,
  field: Field
): NonNullable<CurrentUserFragment[Field]> => {
  const value = user[field];
  if (value == null) {
    throw new Error(`Current user ${user.id} is missing ${field}`);
  }
  return value;
};

export const toPortalUser = (user: CurrentUserFragment): PortalUser => ({
  ...user,
  selected_organization_id: requireField(user, 'selected_organization_id'),
  capabilities: requireField(user, 'capabilities'),
  organizations: requireField(user, 'organizations'),
});
