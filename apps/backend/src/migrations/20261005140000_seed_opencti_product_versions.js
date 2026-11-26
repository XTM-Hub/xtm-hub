const PRODUCT = 'opencti';

// OpenCTI release tags (https://github.com/OpenCTI-Platform/opencti/tags):
// 6.x follows semantic versioning, 7.x and later follows calendar versioning
// (7.YYMMDD.patch, first tag 7.260224.0). Older majors are not needed.
// Tags that ManifestFragmentHelper.validateAndFormatManifestVersion would
// reject (6.2.7-hotfix, 7.260309.0-lts1) are left out.
const OPENCTI_VERSIONS = [
  '6.0.0',
  '6.0.1',
  '6.0.2',
  '6.0.3',
  '6.0.4',
  '6.0.5',
  '6.0.6',
  '6.0.7',
  '6.0.8',
  '6.0.9',
  '6.0.10',
  '6.1.0',
  '6.1.1',
  '6.1.2',
  '6.1.3',
  '6.1.4',
  '6.1.5',
  '6.1.6',
  '6.1.7',
  '6.1.8',
  '6.1.9',
  '6.1.10',
  '6.1.11',
  '6.1.12',
  '6.1.13',
  '6.2.0',
  '6.2.1',
  '6.2.2',
  '6.2.3',
  '6.2.4',
  '6.2.5',
  '6.2.6',
  '6.2.7',
  '6.2.8',
  '6.2.9',
  '6.2.10',
  '6.2.11',
  '6.2.12',
  '6.2.13',
  '6.2.14',
  '6.2.15',
  '6.2.16',
  '6.2.17',
  '6.2.18',
  '6.2.19',
  '6.3.0',
  '6.3.1',
  '6.3.3',
  '6.3.4',
  '6.3.5',
  '6.3.6',
  '6.3.7',
  '6.3.8',
  '6.3.9',
  '6.3.10',
  '6.3.11',
  '6.3.12',
  '6.3.13',
  '6.3.14',
  '6.4.0',
  '6.4.1',
  '6.4.2',
  '6.4.3',
  '6.4.4',
  '6.4.5',
  '6.4.6',
  '6.4.7',
  '6.4.8',
  '6.4.9',
  '6.4.10',
  '6.4.11',
  '6.5.0',
  '6.5.1',
  '6.5.2',
  '6.5.3',
  '6.5.4',
  '6.5.5',
  '6.5.6',
  '6.5.7',
  '6.5.8',
  '6.5.9',
  '6.5.10',
  '6.5.11',
  '6.6.0',
  '6.6.1',
  '6.6.2',
  '6.6.3',
  '6.6.4',
  '6.6.5',
  '6.6.6',
  '6.6.7',
  '6.6.8',
  '6.6.9',
  '6.6.10',
  '6.6.11',
  '6.6.12',
  '6.6.13',
  '6.6.14',
  '6.6.15',
  '6.6.16',
  '6.6.17',
  '6.6.18',
  '6.7.0',
  '6.7.1',
  '6.7.2',
  '6.7.3',
  '6.7.4',
  '6.7.5',
  '6.7.6',
  '6.7.7',
  '6.7.8',
  '6.7.9',
  '6.7.10',
  '6.7.11',
  '6.7.12',
  '6.7.13',
  '6.7.14',
  '6.7.15',
  '6.7.16',
  '6.7.17',
  '6.7.18',
  '6.7.19',
  '6.7.20',
  '6.8.0',
  '6.8.1',
  '6.8.2',
  '6.8.3',
  '6.8.4',
  '6.8.5',
  '6.8.6',
  '6.8.7',
  '6.8.8',
  '6.8.9',
  '6.8.10',
  '6.8.11',
  '6.8.12',
  '6.8.13',
  '6.8.14',
  '6.8.15',
  '6.8.16',
  '6.8.17',
  '6.9.0',
  '6.9.1',
  '6.9.2',
  '6.9.3',
  '6.9.4',
  '6.9.5',
  '6.9.6',
  '6.9.7',
  '6.9.8',
  '6.9.9',
  '6.9.10',
  '6.9.11',
  '6.9.12',
  '6.9.13',
  '6.9.14',
  '6.9.15',
  '6.9.16',
  '6.9.17',
  '6.9.18',
  '6.9.19',
  '6.9.20',
  '6.9.21',
  '6.9.22',
  '6.9.23',
  '6.9.24',
  '6.9.25',
  '6.9.26',
  '6.9.27',
  '6.9.28',
  '6.9.29',
  '7.260224.0',
  '7.260227.0',
  '7.260305.0',
  '7.260306.0',
  '7.260306.1',
  '7.260309.0',
  '7.260309.0-lts.2',
  '7.260309.0-lts.3',
  '7.260309.0-lts.4',
  '7.260309.0-lts.5',
  '7.260309.0-lts.6',
  '7.260309.0-lts.7',
  '7.260317.0',
  '7.260318.0',
  '7.260326.0',
  '7.260401.0',
  '7.260409.0',
  '7.260416.0',
  '7.260417.0',
  '7.260422.0',
  '7.260423.0',
  '7.260428.0',
  '7.260430.0',
  '7.260506.0',
  '7.260507.0',
  '7.260510.0',
  '7.260512.0',
  '7.260513.0',
  '7.260515.0',
  '7.260520.0',
  '7.260521.0',
  '7.260522.0',
  '7.260527.0',
  '7.260529.0',
  '7.260604.0',
  '7.260609.0',
  '7.260615.0',
  '7.260619.0',
  '7.260624.0',
  '7.260626.0',
  '7.260701.0',
  '7.260706.0',
  '7.260710.0',
  '7.260715.0',
  '7.260722.0',
  '7.260728.0',
  '7.260803.0',
  '7.260807.0',
  '7.260811.0',
  '7.260811.0-lts.1',
  '7.260817.0',
  '7.260824.0',
  '7.260828.0',
  '7.260901.0',
  '7.260902.0',
  '7.260904.0',
  '7.260907.0',
  '7.260910.0',
  '7.260914.0',
  '7.260917.0',
  '7.260921.0',
  '7.260928.0',
  '7.260928.1',
  '7.260930.0',
  '7.261002.0',
];

const MANIFEST_VERSION_REGEX = /^(\d+)\.(\d{1,6})\.(\d+)(?:-lts\.(\d+))?$/i;

/**
 * Mirrors src/modules/shareable-resource/manifest-fragment/manifest-fragment.helper.ts#ManifestFragmentHelper.validateAndFormatManifestVersion.
 * Duplicated here since migrations do not import application source code.
 * @param {string} version
 * @returns {string}
 */
function formatVersionPadded(version) {
  const match = version.match(MANIFEST_VERSION_REGEX);
  if (!match) {
    throw new Error(`Invalid product version format: ${version}`);
  }

  const major = (match[1] ?? '0').padStart(3, '0');
  const datePart = (match[2] ?? '0').padStart(6, '0');
  const patch = (match[3] ?? '0').padStart(3, '0');

  if (!/-lts/i.test(version)) {
    return `${major}.${datePart}.${patch}`;
  }

  const ltsPatch = (match[4] ?? '0').padStart(3, '0');
  return `${major}.${datePart}.${patch}.LTS.${ltsPatch}`;
}

const INSERT_BATCH_SIZE = 200;

/**
 * Registers the OpenCTI 6.x and 7.x releases so the "OpenCTI compatibility
 * version" filter and /opencti/:version/versions-matrix know them before a
 * platform reports them. Versions already registered are left untouched.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  const rows = OPENCTI_VERSIONS.map((version) => ({
    product: PRODUCT,
    version,
    version_padded: formatVersionPadded(version),
  }));

  for (let i = 0; i < rows.length; i += INSERT_BATCH_SIZE) {
    await knex('ProductVersion')
      .insert(rows.slice(i, i + INSERT_BATCH_SIZE))
      .onConflict(['product', 'version'])
      .ignore();
  }
}

/**
 * Removes the versions listed above. A listed version a platform had already
 * registered is removed too, it is registered again the next time it reports.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex('ProductVersion')
    .where({ product: PRODUCT })
    .whereIn('version', OPENCTI_VERSIONS)
    .delete();
}
