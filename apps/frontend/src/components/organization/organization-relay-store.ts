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
 * The header organization switcher still reads the user's organizations
 * through the Relay `me` fragment. Editing through react-query no longer
 * normalizes the response into that store, so the record is updated by id
 * here, as the former Relay mutation did. Without it, the switcher keeps
 * showing the former name until the next full reload.
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
