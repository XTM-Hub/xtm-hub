// Must match MINIMUM_PLATFORM_VERSION_BY_CONNECTOR_TYPE.INTERNAL_HUNT in connector-type.helper.ts.
export const INTERNAL_HUNT_MINIMUM_VERSION = '7.261003.0';
export const INTERNAL_HUNT_MINIMUM_VERSION_PADDED = '007.261003.000';

// Must match OPENCTI_CONNECTOR_TYPES and ConnectorTypeHelper.normalize in connector-type.helper.ts.
export const OPENCTI_CONNECTOR_TYPES = [
  'EXTERNAL_IMPORT',
  'INTERNAL_ANALYSIS',
  'INTERNAL_ENRICHMENT',
  'INTERNAL_EXPORT_FILE',
  'INTERNAL_HUNT',
  'INTERNAL_IMPORT_FILE',
  'STREAM',
];

export const normalizeConnectorType = (value) => {
  if (typeof value !== 'string') return undefined;
  const candidate = value.trim().toUpperCase().replace(/-/g, '_');
  return OPENCTI_CONNECTOR_TYPES.includes(candidate) ? candidate : undefined;
};

const canonicalizeConnectorTypes = async (knex) => {
  const rows = await knex('Document_Metadata')
    .select('document_id', 'value')
    .where({ key: 'image_type' });
  const huntConnectorIds = [];
  for (const row of rows) {
    const connectorType = normalizeConnectorType(row.value);
    if (connectorType && connectorType !== row.value) {
      await knex('Document_Metadata')
        .where({ document_id: row.document_id, key: 'image_type' })
        .update({ value: connectorType });
    }
    if (connectorType === 'INTERNAL_HUNT') {
      huntConnectorIds.push(row.document_id);
    }
  }
  return huntConnectorIds;
};

// Must match MANIFEST_VERSION_PATTERN and validateAndFormatManifestVersion in manifest-fragment.helper.ts.
const MANIFEST_VERSION_REGEX = /^(\d+)\.(\d{1,6})\.(\d+)(?:-lts\.(\d+))?$/i;

export const toPaddedVersion = (version) => {
  const match =
    typeof version === 'string' ? version.match(MANIFEST_VERSION_REGEX) : null;
  if (!match) return undefined;
  const major = match[1].padStart(3, '0');
  const datePart = match[2].padStart(6, '0');
  const patch = match[3].padStart(3, '0');
  if (!/-lts/i.test(version)) {
    return `${major}.${datePart}.${patch}`;
  }
  return `${major}.${datePart}.${patch}.LTS.${(match[4] ?? '0').padStart(3, '0')}`;
};

/**
 * Same rule as ConnectorTypeHelper.resolveMinimumDeployableVersion: keep the
 * declared minimum when it is at or above the floor, otherwise use the floor.
 * Legacy connectors only store the raw minimum, manifest fragment connectors
 * store both forms; the padded form is backfilled to match the raw one.
 */
const applyHuntFloor = async (knex, huntConnectorIds) => {
  const rows = await knex('Document_Metadata')
    .select('document_id', 'key', 'value')
    .whereIn('document_id', huntConnectorIds)
    .whereIn('key', [
      'minimum_deployable_version',
      'minimum_deployable_version_padded',
    ]);
  const storedByDocumentId = new Map();
  for (const row of rows) {
    const stored = storedByDocumentId.get(row.document_id) ?? {};
    stored[row.key] = row.value;
    storedByDocumentId.set(row.document_id, stored);
  }

  const updates = [];
  for (const documentId of huntConnectorIds) {
    const stored = storedByDocumentId.get(documentId) ?? {};
    const declared = stored.minimum_deployable_version?.trim() || undefined;
    const declaredPadded = declared
      ? toPaddedVersion(declared)
      : stored.minimum_deployable_version_padded;
    const keepsDeclared =
      declaredPadded !== undefined &&
      declaredPadded !== null &&
      declaredPadded >= INTERNAL_HUNT_MINIMUM_VERSION_PADDED;

    const target = keepsDeclared
      ? {
          minimum_deployable_version: declared,
          minimum_deployable_version_padded: declaredPadded,
        }
      : {
          minimum_deployable_version: INTERNAL_HUNT_MINIMUM_VERSION,
          minimum_deployable_version_padded:
            INTERNAL_HUNT_MINIMUM_VERSION_PADDED,
        };
    for (const [key, value] of Object.entries(target)) {
      if (value !== undefined && stored[key] !== value) {
        updates.push({ document_id: documentId, key, value });
      }
    }
  }
  if (updates.length === 0) {
    return;
  }

  await knex('Document_Metadata')
    .insert(updates)
    .onConflict(['document_id', 'key'])
    .merge(['value']);
};

/**
 * A manifest published for a version below the floor before the floor existed
 * may offer a hunt connector to platforms that cannot register it: withdraw it
 * so it is never served again, and queue the rebuild of its product version
 * (resumed at startup by ManifestApp.resumePendingRebuilds).
 */
const withdrawStaleManifests = async (knex, huntConnectorIds) => {
  const staleManifests = await knex('Manifest as manifest')
    .join('Manifest_Document as link', 'link.manifest_id', 'manifest.id')
    .whereIn('link.document_id', huntConnectorIds)
    .andWhere(
      'manifest.version_padded',
      '<',
      INTERNAL_HUNT_MINIMUM_VERSION_PADDED
    )
    .distinct(
      'manifest.id',
      'manifest.product',
      'manifest.version',
      'manifest.type'
    );
  if (staleManifests.length === 0) {
    return;
  }

  const rebuildKeys = new Map(
    staleManifests.map(({ product, version, type }) => [
      `${product}|${version}|${type}`,
      { product, version, type, status: 'pending' },
    ])
  );
  await knex('ManifestRebuildQueue')
    .insert(Array.from(rebuildKeys.values()))
    .onConflict(['product', 'version', 'type', 'status'])
    .ignore();

  const staleManifestIds = staleManifests.map(({ id }) => id);
  await knex('Manifest_Document')
    .whereIn('manifest_id', staleManifestIds)
    .delete();
  await knex('Manifest').whereIn('id', staleManifestIds).delete();
};

/**
 * Hunt connectors (image_type INTERNAL_HUNT) can only run on OpenCTI 7.261003.0
 * or later. Store every known connector type in its canonical form, raise the
 * minimum deployable version of the hunt connectors ingested before the floor
 * existed, and withdraw the manifests that offered them below it. Running it
 * again changes nothing.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  const huntConnectorIds = await canonicalizeConnectorTypes(knex);
  if (huntConnectorIds.length === 0) {
    return;
  }
  await applyHuntFloor(knex, huntConnectorIds);
  await withdrawStaleManifests(knex, huntConnectorIds);
}

/**
 * The previous minimums and manifests are not kept: a hunt connector must
 * never become deployable on a platform that cannot register it again.
 *
 * @returns { Promise<void> }
 */
export async function down() {}
