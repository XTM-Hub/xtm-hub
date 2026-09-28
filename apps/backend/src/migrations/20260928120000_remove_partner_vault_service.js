import { v4 as uuidv4 } from 'uuid';

const VAULT_IDENTIFIER = 'vault';

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // `identifier` is not a unique column on ServiceDefinition, so query every
  // matching row instead of assuming a single legacy vault definition exists.
  const vaultServiceDefinitions = await knex('ServiceDefinition')
    .where({ identifier: VAULT_IDENTIFIER })
    .select('id');

  if (vaultServiceDefinitions.length === 0) {
    return;
  }
  const vaultServiceDefinitionIds = vaultServiceDefinitions.map(
    (definition) => definition.id
  );

  const vaultServiceInstances = await knex('ServiceInstance')
    .whereIn('service_definition_id', vaultServiceDefinitionIds)
    .select('id');
  const vaultServiceInstanceIds = vaultServiceInstances.map(
    (instance) => instance.id
  );

  if (vaultServiceInstanceIds.length > 0) {
    // Cascades (ON DELETE CASCADE): Subscription, Service_Link, Document
    // (which itself cascades Document_Metadata / Document_Children),
    // User_Service (via Subscription) and Subscription_Capability /
    // UserService_Capability (via Subscription / User_Service). This does
    // not remove the underlying files from MinIO — only the database rows.
    await knex('ServiceInstance').whereIn('id', vaultServiceInstanceIds).del();
  }

  // Service_Capability has no cascading delete from ServiceDefinition, but by
  // now no Subscription_Capability row can reference it (they were removed by
  // the ServiceInstance cascade above), so it's safe to delete directly.
  await knex('Service_Capability')
    .whereIn('service_definition_id', vaultServiceDefinitionIds)
    .del();

  await knex('ServiceDefinition')
    .whereIn('id', vaultServiceDefinitionIds)
    .del();
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  const existing = await knex('ServiceDefinition')
    .where({ identifier: VAULT_IDENTIFIER })
    .first();
  if (existing) {
    return;
  }

  // NOTE: this only restores the service definition and its capabilities so
  // the schema-level change is reversible. Any ServiceInstance rows,
  // documents and uploaded files that existed before `up()` ran, along with
  // the associated subscriptions, were permanently deleted and cannot be
  // recreated here.
  const serviceDefinitionId = uuidv4();
  await knex('ServiceDefinition').insert({
    id: serviceDefinitionId,
    name: 'Vault',
    description: 'Vault services to share information',
    public: true,
    identifier: VAULT_IDENTIFIER,
  });

  await knex('Service_Capability').insert([
    {
      id: uuidv4(),
      name: 'UPLOAD',
      description: 'The user can upload documents in this service.',
      service_definition_id: serviceDefinitionId,
    },
    {
      id: uuidv4(),
      name: 'DELETE',
      description: 'The user can delete documents in this service.',
      service_definition_id: serviceDefinitionId,
    },
  ]);
}
