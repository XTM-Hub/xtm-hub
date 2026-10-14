const TAG_DECOUPLING = 'decoupling';
const OPENCTI_INTEGRATION_DOCUMENT_TYPE = 'opencti_integration';

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex('ManifestRebuildQueue').del();
  await knex('Manifest_Document').del();
  await knex('Manifest').del();

  const decoupledConnectorIds = () =>
    knex('Document')
      .select('id')
      .where('type', OPENCTI_INTEGRATION_DOCUMENT_TYPE)
      .whereRaw('"tags" @> ARRAY[?]::text[]', [TAG_DECOUPLING]);

  const decoupledChildIds = () =>
    knex('Document_Children')
      .select('child_document_id')
      .whereIn('parent_document_id', decoupledConnectorIds())
      .whereNotIn(
        'child_document_id',
        knex('Document_Children')
          .select('child_document_id')
          .whereNotIn('parent_document_id', decoupledConnectorIds())
      );

  for (const documentIds of [decoupledChildIds, decoupledConnectorIds]) {
    await knex('ServiceInstance')
      .whereIn('logo_document_id', documentIds())
      .update({ logo_document_id: null });
    await knex('ServiceInstance')
      .whereIn('illustration_document_id', documentIds())
      .update({ illustration_document_id: null });

    await knex('Object_UseCase').whereIn('object_id', documentIds()).del();

    await knex('Document').whereIn('id', documentIds()).del();
  }
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down() {}
