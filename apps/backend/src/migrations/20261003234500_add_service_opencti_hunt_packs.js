import { v4 as uuidv4 } from 'uuid';

const SERVICE_IDENTIFIER = 'opencti_hunt_packs';

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  const existing = await knex('ServiceDefinition')
    .where({ identifier: SERVICE_IDENTIFIER })
    .first('id');
  if (existing) {
    return;
  }

  const serviceDefinitionId = uuidv4();

  await knex('ServiceDefinition').insert([
    {
      id: serviceDefinitionId,
      name: 'OpenCTI Hunt Packs Library',
      description:
        'Explore a range of OpenCTI hunt packs shared by the Filigran team',
      public: true,
      identifier: SERVICE_IDENTIFIER,
    },
  ]);

  await knex('ServiceInstance').insert([
    {
      id: uuidv4(),
      name: 'OpenCTI Hunt Packs Library',
      description:
        'Explore a range of OpenCTI hunt packs shared by the Filigran team: threat hunts with their hypotheses, Sigma rules and native queries, ready to import as draft hunts.',
      service_definition_id: serviceDefinitionId,
      public: true,
      slug: 'opencti-hunt-packs',
      tags: ['openCTI'],
    },
  ]);

  await knex('Service_Capability').insert([
    {
      id: uuidv4(),
      name: 'UPLOAD',
      description: 'The user can upload OpenCTI hunt packs in this service.',
      service_definition_id: serviceDefinitionId,
    },
    {
      id: uuidv4(),
      name: 'DELETE',
      description: 'The user can delete OpenCTI hunt packs in this service.',
      service_definition_id: serviceDefinitionId,
    },
  ]);
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  const serviceDefinitions = await knex('ServiceDefinition')
    .where({ identifier: SERVICE_IDENTIFIER })
    .select('id');
  for (const serviceDefinition of serviceDefinitions) {
    await knex('Service_Capability')
      .where({ service_definition_id: serviceDefinition.id })
      .delete();
    await knex('ServiceInstance')
      .where({ service_definition_id: serviceDefinition.id })
      .delete();
    await knex('ServiceDefinition')
      .where({ id: serviceDefinition.id })
      .delete();
  }
}
