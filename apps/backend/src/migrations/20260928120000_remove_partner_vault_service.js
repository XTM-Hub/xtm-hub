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
    // DeploymentRequest.service_instance_id and PlatformConfiguration have no
    // cascading delete from ServiceInstance (and the former is NOT NULL), so
    // clear them explicitly before removing the ServiceInstance rows.
    await knex('DeploymentRequest')
      .whereIn('service_instance_id', vaultServiceInstanceIds)
      .del();
    await knex('PlatformConfiguration')
      .whereIn('service_instance_id', vaultServiceInstanceIds)
      .del();

    // ServiceInstance.logo_document_id / illustration_document_id reference
    // Document with no cascading delete either. Documents owned by these
    // vault instances are about to be cascade-deleted (see below), so clear
    // any ServiceInstance row — vault or not — that still points at one of
    // them as its logo/illustration.
    const vaultDocumentIds = await knex('Document')
      .whereIn('service_instance_id', vaultServiceInstanceIds)
      .select('id')
      .then((rows) => rows.map((row) => row.id));
    if (vaultDocumentIds.length > 0) {
      await knex('ServiceInstance')
        .whereIn('logo_document_id', vaultDocumentIds)
        .update({ logo_document_id: null });
      await knex('ServiceInstance')
        .whereIn('illustration_document_id', vaultDocumentIds)
        .update({ illustration_document_id: null });
    }

    // Cascades (ON DELETE CASCADE): Subscription, Service_Link, Document
    // (which itself cascades Document_Metadata / Document_Children),
    // User_Service (via Subscription) and Subscription_Capability /
    // UserService_Capability (via Subscription / User_Service). This does
    // not remove the underlying files from MinIO — only the database rows.
    await knex('ServiceInstance').whereIn('id', vaultServiceInstanceIds).del();
  }

  // Service_Capability has no cascading delete from ServiceDefinition, and
  // some Subscription_Capability rows are orphaned (no subscription_id) due
  // to a historical data bug, so delete them explicitly here too.
  await knex('Subscription_Capability')
    .whereIn(
      'service_capability_id',
      knex('Service_Capability')
        .whereIn('service_definition_id', vaultServiceDefinitionIds)
        .select('id')
    )
    .del();

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
