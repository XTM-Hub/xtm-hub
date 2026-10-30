const SERVICE_NAME = 'XTM One Documentation';
const SERVICE_SLUG = 'xtmone-documentation';
const SERVICE_INSTANCE_ID = '14201995-80af-44c2-9798-231368d131d3';
const SERVICE_LINK_ID = 'b008c2bb-0ebd-47d1-8d90-15e89cb80486';

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  const linkServiceDefinition = await knex('ServiceDefinition')
    .where('identifier', '=', 'link')
    .select('id')
    .first();
  if (!linkServiceDefinition?.id) {
    throw new Error('Service definition not found');
  }

  // ServiceInstance.slug has no unique constraint: keep a link an admin may already have created.
  const existingService = await knex('ServiceInstance')
    .where({ slug: SERVICE_SLUG })
    .first('id');
  if (existingService) {
    return;
  }

  await knex('ServiceInstance').insert({
    id: SERVICE_INSTANCE_ID,
    name: SERVICE_NAME,
    slug: SERVICE_SLUG,
    description:
      'Technical docs and user guides to help you understand how the platform works',
    creation_status: 'READY',
    public: true,
    tags: ['xtmOne', 'trial'],
    service_definition_id: linkServiceDefinition.id,
  });

  await knex('Service_Link').insert({
    id: SERVICE_LINK_ID,
    service_instance_id: SERVICE_INSTANCE_ID,
    url: 'https://docs.xtmone.io/',
    name: SERVICE_NAME,
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex('Service_Link').where({ id: SERVICE_LINK_ID }).del();
  await knex('ServiceInstance').where({ id: SERVICE_INSTANCE_ID }).del();
}
