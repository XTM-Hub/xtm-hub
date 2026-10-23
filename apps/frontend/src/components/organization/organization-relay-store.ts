import type { OrganizationEditMutation } from '@graphql/generated';
import { commitLocalUpdate, type IEnvironment } from 'relay-runtime';

type EditedOrganization = NonNullable<
  OrganizationEditMutation['editOrganization']
>;

const SYNCED_FIELDS = [
  'name',
  'domains',
] as const satisfies readonly (keyof EditedOrganization)[];

/**
 * The uploader organization field still lists the user's organizations by name
 * from the Relay `me` fragment, which a react-query edit no longer updates:
 * without this, it shows the former name until the next full reload.
 */
export const syncEditedOrganizationToRelayStore = (
  environment: IEnvironment,
  organization: EditedOrganization | null | undefined
) => {
  if (!organization) {
    return;
  }

  commitLocalUpdate(environment, (store) => {
    const record = store.get(organization.id);
    if (!record) {
      return;
    }
    SYNCED_FIELDS.forEach((field) => {
      record.setValue(organization[field] ?? null, field);
    });
  });
};
