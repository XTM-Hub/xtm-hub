// eslint-disable-next-line @typescript-eslint/no-require-imports
const { makePgTsGenerator, markAsGenerated } = require('kanel');

const DEFAULT_IMPORT_PATH = '../../../__generated__/resolvers-types';

/**
 * Maps table names to their column → TypeScript enum type overrides.
 * Each value is either a plain string (uses DEFAULT_IMPORT_PATH) or
 * an object { tsType, importPath } for a custom import path.
 * Nullability is handled automatically by Kanel from the DB schema.
 */
const COLUMN_ENUM_MAP = {
  Competitor: {
    tier: 'CompetitorTier',
  },
  DeploymentRequest: {
    platform_identifier: 'PlatformIdentifier',
    region: 'DeploymentRequestPlatformRegion',
    type: 'DeploymentRequestDeploymentType',
    hub_status: 'DeploymentRequestHubStatus',
    target_state: 'DeploymentRequestPlatformState',
    actual_state: 'DeploymentRequestPlatformState',
    use_case: 'DeploymentRequestUseCase',
    activity_sector: 'DeploymentRequestActivitySector',
    job_title: 'DeploymentRequestJobTitle',
    source: 'DeploymentRequestSource',
  },
  DeploymentRequestQuota: {
    platform_identifier: 'PlatformIdentifier',
    region: 'DeploymentRequestPlatformRegion',
    type: 'DeploymentRequestDeploymentType',
  },
  Epic: {
    products: 'FiligranProduct',
    timeline: 'Timeline',
    epic_type: 'EpicType',
    edition_type: 'EditionType',
  },
  UseCase: {
    product: 'FiligranProduct',
  },
  ServiceDefinition: {
    identifier: 'ServiceDefinitionIdentifier',
  },
  SolutionCategory: {
    product: 'FiligranProduct',
  },
  ServiceInstance: {
    creation_status: 'ServiceInstanceCreationStatus',
    join_type: 'ServiceInstanceJoinType',
    tags: 'ServiceInstanceTag',
    illustration_document_id: {
      tsType: 'DocumentId',
      importPath: './Document',
    },
  },
  PlatformConfiguration: {
    platform_contract: 'PlatformContract',
    status: 'PlatformConfigurationStatus',
  },
  NewsFeedItem: {
    type: 'NewsFeedItemType',
    platform_identifier: 'PlatformIdentifier',
  },
  ManifestRebuildQueue: {
    product: 'PlatformIdentifier',
    type: 'ManifestType',
    status: {
      tsType: 'ManifestRebuildQueueStatus',
      importPath:
        '../../../modules/shareable-resource/manifest/manifest.consts',
    },
  },
  Manifest: {
    type: 'ManifestType',
  },
  ProductVersion: {
    product: 'PlatformIdentifier',
  },
};

/** @type {import('kanel').Config} */
module.exports = {
  connection: {
    host: '127.0.0.1',
    port: 5434,
    user: 'portal',
    password: 'portal-password',
    database: 'cloud-portal',
  },

  outputPath: './src/model/kanel',
  preDeleteOutputFolder: true,
  schemaNames: ['public'],

  postRenderHooks: [markAsGenerated],

  generators: [
    makePgTsGenerator({
      customTypeMap: {
        'pg_catalog.tsvector': 'string',
        'pg_catalog.bpchar': 'string',
      },

      getPropertyMetadata(property, details, generateFor, builtinMetadata) {
        const columnEntry = COLUMN_ENUM_MAP[details.name]?.[property.name];
        if (columnEntry) {
          const tsType =
            typeof columnEntry === 'string' ? columnEntry : columnEntry.tsType;
          const importPath =
            typeof columnEntry === 'string'
              ? DEFAULT_IMPORT_PATH
              : columnEntry.importPath;
          return {
            name: property.name,
            typeOverride: {
              name: tsType,
              typeImports: [
                {
                  name: tsType,
                  isDefault: false,
                  path: importPath,
                  isAbsolute: true,
                  importAsType: true,
                },
              ],
            },
          };
        }
        return builtinMetadata;
      },
    }),
  ],
};
