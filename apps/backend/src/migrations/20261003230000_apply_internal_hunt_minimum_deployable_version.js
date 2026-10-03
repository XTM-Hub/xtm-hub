// Must match MINIMUM_PLATFORM_VERSION_BY_CONNECTOR_TYPE.INTERNAL_HUNT in connector-type.helper.ts.
export const INTERNAL_HUNT_MINIMUM_VERSION = '7.261003.0';
export const INTERNAL_HUNT_MINIMUM_VERSION_PADDED = '007.261003.000';

/**
 * Hunt connectors (image_type INTERNAL_HUNT) can only run on OpenCTI 7.261003.0
 * or later. Raise the minimum deployable version of the hunt connectors
 * ingested before ingestion applied that floor. Running it again changes nothing.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  const huntConnectorIds = (
    await knex('Document_Metadata')
      .select('document_id')
      .where({ key: 'image_type', value: 'INTERNAL_HUNT' })
  ).map((row) => row.document_id);
  if (huntConnectorIds.length === 0) {
    return;
  }

  const paddedRows = await knex('Document_Metadata')
    .select('document_id', 'value')
    .whereIn('document_id', huntConnectorIds)
    .andWhere('key', 'minimum_deployable_version_padded');
  const paddedByDocumentId = new Map(
    paddedRows.map((row) => [row.document_id, row.value])
  );

  const belowFloorIds = huntConnectorIds.filter((documentId) => {
    const padded = paddedByDocumentId.get(documentId);
    return !padded || padded < INTERNAL_HUNT_MINIMUM_VERSION_PADDED;
  });
  if (belowFloorIds.length === 0) {
    return;
  }

  await knex('Document_Metadata')
    .insert(
      belowFloorIds.flatMap((documentId) => [
        {
          document_id: documentId,
          key: 'minimum_deployable_version',
          value: INTERNAL_HUNT_MINIMUM_VERSION,
        },
        {
          document_id: documentId,
          key: 'minimum_deployable_version_padded',
          value: INTERNAL_HUNT_MINIMUM_VERSION_PADDED,
        },
      ])
    )
    .onConflict(['document_id', 'key'])
    .merge(['value']);
}

/**
 * The previous minimums are not kept: a hunt connector must never become
 * deployable on a platform that cannot register it again.
 *
 * @returns { Promise<void> }
 */
export async function down() {}
