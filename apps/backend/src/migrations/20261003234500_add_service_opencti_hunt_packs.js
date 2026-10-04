const SERVICE_IDENTIFIER = 'opencti_hunt_packs';

// Fixed identifiers: the rollback removes only the rows this migration created.
const SERVICE_DEFINITION_ID = 'ab9bdd8a-6070-4509-be8b-0bffd74ea8c4';
const SERVICE_INSTANCE_ID = 'f2756f42-376b-45e2-b935-7529763aaf60';
const UPLOAD_CAPABILITY_ID = '82823270-5f12-4f0b-96fe-7a7400d54b32';
const DELETE_CAPABILITY_ID = 'f5632178-bb73-4bb7-a1bd-7740a4ef849d';

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  const existing = await knex('ServiceDefinition')
    .where({ identifier: SERVICE_IDENTIFIER })
    .whereNot({ id: SERVICE_DEFINITION_ID })
    .first('id');
  if (existing) {
    return;
  }

  await knex('ServiceDefinition')
    .insert({
      id: SERVICE_DEFINITION_ID,
      name: 'OpenCTI Hunt Packs Library',
      description:
        'Explore a range of OpenCTI hunt packs shared by the Filigran team',
      public: true,
      identifier: SERVICE_IDENTIFIER,
    })
    .onConflict('id')
    .ignore();

  await knex('ServiceInstance')
    .insert({
      id: SERVICE_INSTANCE_ID,
      name: 'OpenCTI Hunt Packs Library',
      description:
        'Explore a range of OpenCTI hunt packs shared by the Filigran team: threat hunts with their hypotheses, Sigma rules and native queries, ready to import as draft hunts.',
      service_definition_id: SERVICE_DEFINITION_ID,
      public: true,
      slug: 'opencti-hunt-packs',
      tags: ['openCTI'],
    })
    .onConflict('id')
    .ignore();

  await knex('Service_Capability')
    .insert([
      {
        id: UPLOAD_CAPABILITY_ID,
        name: 'UPLOAD',
        description: 'The user can upload OpenCTI hunt packs in this service.',
        service_definition_id: SERVICE_DEFINITION_ID,
      },
      {
        id: DELETE_CAPABILITY_ID,
        name: 'DELETE',
        description: 'The user can delete OpenCTI hunt packs in this service.',
        service_definition_id: SERVICE_DEFINITION_ID,
      },
    ])
    .onConflict('id')
    .ignore();
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  const capabilityIds = [UPLOAD_CAPABILITY_ID, DELETE_CAPABILITY_ID];
  // Subscription_Capability does not cascade on Service_Capability deletion.
  await knex('Subscription_Capability')
    .whereIn('service_capability_id', capabilityIds)
    .delete();
  await knex('Service_Capability').whereIn('id', capabilityIds).delete();
  await knex('ServiceInstance').where({ id: SERVICE_INSTANCE_ID }).delete();
  await knex('ServiceDefinition').where({ id: SERVICE_DEFINITION_ID }).delete();
}
