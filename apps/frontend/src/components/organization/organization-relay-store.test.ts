import type { OrganizationEditMutation } from '@graphql/generated';
import { Environment, Network, RecordSource, Store } from 'relay-runtime';
import { describe, expect, it } from 'vitest';
import { syncEditedOrganizationToRelayStore } from './organization-relay-store';

const ORGANIZATION_ID = 'organization-id';
const FORMER_NAME = 'Filigran';
const NEW_NAME = 'Filigran Labs';
const FORMER_DOMAINS = ['filigran.io'];
const NEW_DOMAINS = ['filigran.io', 'filigran.com'];

const buildEnvironment = (
  records: ConstructorParameters<typeof RecordSource>[0] = {}
) =>
  new Environment({
    network: Network.create(() => {
      throw new Error('No network call expected');
    }),
    store: new Store(new RecordSource(records)),
  });

const organizationRecord = {
  __id: ORGANIZATION_ID,
  __typename: 'Organization',
  id: ORGANIZATION_ID,
  name: FORMER_NAME,
  domains: FORMER_DOMAINS,
  personal_space: false,
};

const editedOrganization: NonNullable<
  OrganizationEditMutation['editOrganization']
> = {
  id: ORGANIZATION_ID,
  name: NEW_NAME,
  domains: NEW_DOMAINS,
  personal_space: false,
};

const getRecord = (environment: Environment) =>
  environment.getStore().getSource().get(ORGANIZATION_ID);

describe('syncEditedOrganizationToRelayStore', () => {
  it('should write the edited name and domains into the Relay store by id', () => {
    // Given
    const environment = buildEnvironment({
      [ORGANIZATION_ID]: organizationRecord,
    });

    // When
    syncEditedOrganizationToRelayStore(environment, editedOrganization);

    // Then
    expect(getRecord(environment)).toMatchObject({
      name: NEW_NAME,
      domains: NEW_DOMAINS,
      personal_space: false,
    });
  });

  it('should not create a record when the organization is not in the Relay store', () => {
    // Given
    const environment = buildEnvironment();

    // When
    syncEditedOrganizationToRelayStore(environment, editedOrganization);

    // Then
    expect(getRecord(environment)).toBeUndefined();
  });

  it('should do nothing when the mutation returns no organization', () => {
    // Given
    const environment = buildEnvironment({
      [ORGANIZATION_ID]: organizationRecord,
    });

    // When
    syncEditedOrganizationToRelayStore(environment, null);

    // Then
    expect(getRecord(environment)).toMatchObject({ name: FORMER_NAME });
  });
});
