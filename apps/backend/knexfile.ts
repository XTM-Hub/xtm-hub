import { type PageInfo } from 'graphql-relay/connection/connection';
import pkg, { type Knex } from 'knex';
import { baseConfig } from './knexconfig';
import {
  DeploymentRequestFilter,
  DeploymentRequestFilterKey,
  DocumentMetadataKeyCode,
  Filter,
  FilterKey,
  LogicalFilterInput,
  LogicalOperator,
  ServiceInstanceFilter,
  ServiceInstanceFilterKey,
  SubscriptionFilter,
} from './src/__generated__/resolvers-types';
import portalConfig from './src/config';
import { databaseContext } from './src/context/database.context';
import { DocumentHelper } from './src/modules/document/document.helper';
import { INTEGRATION_METADATA_KEYS } from './src/modules/shareable-resource/opencti/integration/integration.model';
import { logApp } from './src/utils/app-logger.util';
import { extractId } from './src/utils/utils';
import { compareVersions, isValidVersion } from './src/utils/versioning';

type Filters =
  | Filter[]
  | DeploymentRequestFilter[]
  | ServiceInstanceFilter[]
  | SubscriptionFilter[];

export interface SecuryQueryOpts {
  [key: string]: string | number | boolean | string[] | MethodType | Filters;
}

export interface KnexQueryBuilder extends Knex.QueryBuilder {
  _queryContext?: {
    __typename: DatabaseType;
  };
}

declare module 'knex' {
  // TODO: Knex specificity, could be complicated modify the model directly
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Knex {
    interface QueryBuilder {
      asConnection<T>(): Promise<T>;

      tap(fn: (qb: this) => this): this;
    }
  }
}

type BaseDatabaseType =
  | 'User'
  | 'Epic'
  | 'Organization'
  | 'ServiceInstance'
  | 'ServiceDefinition'
  | 'User_RolePortal'
  | 'RolePortal'
  | 'CapabilityPortal'
  | 'RolePortal_CapabilityPortal'
  | 'Subscription'
  | 'Service_Price'
  | 'Service_Link'
  | 'User_Service'
  | 'Generic_Service_Capability'
  | 'Service_Capability'
  | 'Subscription_Capability'
  | 'UserService_Capability'
  | 'MalwareAnalysis'
  | 'UserService'
  | 'Document'
  | 'User_Organization'
  | 'User_Organization_Pending'
  | 'UseCase'
  | 'SolutionCategory'
  | 'Object_UseCase'
  | 'Object_SolutionCategory'
  | 'UserOrganization_Capability'
  | 'User_TransferRequest'
  | 'Document_Children'
  | 'Document_Metadata'
  | 'PlatformConfiguration'
  | 'DeploymentRequest'
  | 'DeploymentRequestQuota'
  | 'ServiceGroup'
  | 'ServiceGroup_User'
  | 'SEO_ServiceInstance'
  | 'SSOGroup_RolePortal'
  | 'Competitor'
  | 'NewsFeedItem'
  | 'NewsFeedItemMetadata'
  | 'ProvisionedNewsFeedItem'
  | 'ManifestRebuildQueue'
  | 'Manifest'
  | 'Manifest_Document'
  | 'ProductVersion'
  | 'PlatformMetadata'
  | 'OneClickDeployment'
  | 'VotingRound'
  | 'VotableFeature'
  | 'VotableFeature_UseCase'
  | 'FeatureVote';

export type DatabaseType =
  | BaseDatabaseType
  | (typeof process.env.NODE_ENV extends 'test' ? 'TestTable' : never);

export type ActionType = 'add' | 'edit' | 'delete' | 'merge' | 'invalidate';
export type MethodType = 'select' | 'insert' | 'update' | 'del';

interface Pagination {
  first?: number | null;
  after?: string | null;
  orderMode?: string | null;
  orderBy?: string | null;
  filters?: Filters | null;
  logicalFilters?: LogicalFilterInput | null;
  searchTerm?: string | null;
}

const knex = pkg;

pkg.QueryBuilder.extend('tap', function (fn) {
  return fn(this) || this;
});
const config: Knex.Config = {
  ...baseConfig,
  migrations: {
    extension: 'js',
    tableName: 'migrations',
    directory: 'src/migrations',
    stub: 'src/migrations/migration.stub',
  },
  seeds: {
    extension: 'js',
    directory: portalConfig.database.seeds,
  },
  postProcessResponse: (result, queryContext) => {
    if (!queryContext?.__typename) return result;
    const __typename = queryContext.__typename;
    if (Array.isArray(result)) {
      return result.map((row) => ({ ...row, __typename }));
    } else if (result && Object.keys(result).length > 0) {
      return { ...result, __typename };
    }
    // Nothing found
    return undefined;
  },
  log: {
    warn: logApp.warn,
    error: logApp.error,
    debug: logApp.debug,
  },
};

export const database = knex(config);

export interface QueryOpts {
  unsecured?: boolean;
  first?: number | null;
  after?: string | null;
  orderMode?: string | null;
  orderBy?: string | null;
  methodType?: MethodType;
  capabilities?: string[];
  searchTerm?: string | null;
  filters?: Filters | null;
  columns?: string[];
  normalizeSearchTerm?: boolean;
}

export const dbRaw: Knex.RawBuilder = database.raw.bind(database);

export function db<T extends object>(
  type: DatabaseType
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Knex.QueryBuilder<T, any> {
  const queryContext = database<T>(type).queryContext({
    __typename: type,
  });

  if (databaseContext.isInTransaction()) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    queryContext.transacting(databaseContext.getTransaction()!);
  }

  return queryContext;
}

export const dbConnections = <T>(
  nodes: T[],
  offset: string | undefined,
  limit: number | undefined,
  totalCount: number
) => {
  const currentOffset = offset ? Number(atob(offset)) : 0;
  const edges: { cursor: string; node: T }[] = nodes.map((n, index) => {
    const nextIndex = index + 1;
    return {
      cursor: btoa(String(currentOffset + nextIndex)),
      node: n,
    };
  });
  const pageInfo: PageInfo = {
    startCursor: edges[0]?.cursor ?? null,
    endCursor: edges.slice(-1)[0]?.cursor ?? null,
    hasNextPage: limit !== undefined ? nodes.length >= limit : false,
    hasPreviousPage: !offset && nodes.length > 0,
  };
  return { edges, pageInfo, totalCount };
};

const searchAttributes = [
  'name',
  'file_name',
  'description',
  'short_description',
  'email',
  'first_name',
  'last_name',
  'country',
  'title',
];

// Cache column names per table so applySearch never calls columnInfo() twice
// for the same table during the lifetime of the process.
const columnInfoCache = new Map<DatabaseType, string[]>();

const getCachedColumnInfo = async (type: DatabaseType): Promise<string[]> => {
  const cached = columnInfoCache.get(type);
  if (cached) return cached;
  const columns = Object.keys(await database(type).columnInfo());
  columnInfoCache.set(type, columns);
  return columns;
};

type JoinFn = (qb: Knex.QueryBuilder, type: DatabaseType) => void;
type WhereFn = (
  qb: Knex.QueryBuilder,
  type: DatabaseType,
  values: string[]
) => void;

type FilterHandler = {
  key: string;
  addJoin?: JoinFn;
  addWhere: WhereFn;
};

const createLabelFilter = (): FilterHandler => ({
  key: FilterKey.Label,
  addJoin: (qb, type) => {
    qb.leftJoin('Object_UseCase as ouc', 'ouc.object_id', '=', `${type}.id`);
  },
  addWhere: (qb, _type, values) => {
    if (!values.length) return;
    qb.whereIn('ouc.use_case_id', values.map(extractId));
  },
});

const createSolutionCategoryFilter = (): FilterHandler => ({
  key: FilterKey.SolutionCategory,
  addJoin: (qb, type) => {
    qb.leftJoin(
      'Object_SolutionCategory as osc',
      'osc.object_id',
      '=',
      `${type}.id`
    );
  },
  addWhere: (qb, _type, values) => {
    if (!values.length) return;
    qb.whereIn('osc.solution_category_id', values.map(extractId));
  },
});

const createEntityTypeFilter = (): FilterHandler => ({
  key: FilterKey.EntityType,
  addWhere: (qb, _type, values) => {
    if (!values.length) return;
    const placeholders = values.map(() => '?').join(',');
    qb.whereExists(function () {
      this.select(dbRaw('1'))
        .from('Document_Metadata')
        .whereRaw('"Document_Metadata"."document_id" = "Document"."id"')
        .andWhere(
          'Document_Metadata.key',
          '=',
          DocumentMetadataKeyCode.EntityTypes
        )
        .andWhereRaw(
          `"Document_Metadata"."value"::jsonb \\?| array[${placeholders}]::text[]`,
          values
        );
    });
  },
});

const createTagsFilter = (): FilterHandler => ({
  key: ServiceInstanceFilterKey.Tags,
  addWhere: (qb, _type, values) => {
    if (!values.length) return;
    const placeholders = values.map(() => '?').join(',');
    qb.whereRaw(
      `"ServiceInstance"."tags"::text[] @> array[${placeholders}]`,
      values
    );
  },
});

const createServiceDefinitionIdentifierFilter = (): FilterHandler => ({
  key: ServiceInstanceFilterKey.ServiceDefinitionIdentifier,
  addJoin: (qb, type) => {
    qb.leftJoin(
      'ServiceDefinition',
      'ServiceDefinition.id',
      '=',
      `${type}.service_definition_id`
    );
  },
  addWhere: (qb, _type, values) => {
    if (!values.length) return;
    qb.whereIn('ServiceDefinition.identifier', values);
  },
});

const createProductVersionFilter = (): FilterHandler => ({
  key: FilterKey.ProductVersion,
  addWhere: (qb, _type, values) => {
    if (!values.length) return;
    const lowestVersion = [...values]
      .filter(isValidVersion)
      .sort(compareVersions)[0]
      ?.replace('-lts', '');

    if (!lowestVersion) {
      return;
    }

    // Exclude documents whose product_version metadata exists and is strictly greater than the target.
    // Documents with no product_version row (IS NULL case) pass through automatically.
    qb.whereNotExists(function () {
      this.select(dbRaw('1'))
        .from('Document_Metadata')
        .whereRaw('"Document_Metadata"."document_id" = "Document"."id"')
        .andWhere('Document_Metadata.key', '=', FilterKey.ProductVersion)
        .whereNotNull('Document_Metadata.value')
        .andWhereRaw(
          `string_to_array(replace("Document_Metadata"."value", '-lts', ''), '.')::int[] > string_to_array(?, '.')::int[]`,
          [lowestVersion]
        );
    });
  },
});

const createPlatformIdentifierFilterHandler = (): FilterHandler => ({
  key: DeploymentRequestFilterKey.PlatformIdentifier,
  addWhere: (qb, _type, values) => {
    if (!values.length) return;
    qb.whereIn('platform_identifier', values);
  },
});

const NULL_FILTER_VALUE = 'null';

const createParentIdFilterHandler = (): FilterHandler => ({
  key: DeploymentRequestFilterKey.ParentId,
  addWhere: (qb, _type, values) => {
    if (!values.includes(NULL_FILTER_VALUE)) return;
    qb.whereNull('DeploymentRequest.parent_id');
  },
});

const createMetadataFilterHandler = (key: string): FilterHandler => ({
  key,
  addWhere: (qb, _type, values) => {
    if (!values.length) return;
    qb.whereExists(function () {
      this.select(dbRaw('1'))
        .from('Document_Metadata')
        .whereRaw('"Document_Metadata"."document_id" = "Document"."id"')
        .andWhere('Document_Metadata.key', '=', key)
        .whereIn('Document_Metadata.value', values);
    });
  },
});

const createIdFilterHandler = (key: string): FilterHandler => ({
  key,
  addWhere: (qb, _type, values) => {
    if (!values.length) return;
    qb.whereIn(key, values.map(extractId));
  },
});

const createDefaultFilterHandler = (key: string): FilterHandler => ({
  key,
  addWhere: (qb, _type, values) => {
    if (!values.length) return;
    qb.whereIn(key, values);
  },
});

export const applyFilterJoins = (
  type: DatabaseType,
  queryContext: Knex.QueryBuilder,
  filters: Filters | undefined | null
) => {
  if (!filters?.length) return queryContext;

  const keysSet = new Set<string>();

  for (const { key } of filters) {
    if (!key || keysSet.has(key)) continue;
    keysSet.add(key);

    const f = getFilterHandler(key);
    if (f.addJoin) {
      f.addJoin(queryContext, type);
    }
  }

  return queryContext;
};

const filterHandlers: Record<string, FilterHandler> = {
  [FilterKey.Label]: createLabelFilter(),
  [FilterKey.SolutionCategory]: createSolutionCategoryFilter(),
  [FilterKey.EntityType]: createEntityTypeFilter(),
  [ServiceInstanceFilterKey.Tags]: createTagsFilter(),
  [ServiceInstanceFilterKey.ServiceDefinitionIdentifier]:
    createServiceDefinitionIdentifierFilter(),
  [FilterKey.ProductVersion]: createProductVersionFilter(),
  [DeploymentRequestFilterKey.PlatformIdentifier]:
    createPlatformIdentifierFilterHandler(),
  [DeploymentRequestFilterKey.ParentId]: createParentIdFilterHandler(),
};

const getFilterHandler = (key: string): FilterHandler => {
  if (filterHandlers[key]) {
    return filterHandlers[key];
  }

  // Check if it's a metadata filter
  if (INTEGRATION_METADATA_KEYS.includes(key as DocumentMetadataKeyCode)) {
    return createMetadataFilterHandler(key);
  }

  // Check if it's an ID filter
  if (key.includes('id')) {
    return createIdFilterHandler(key);
  }

  // Use default handler
  return createDefaultFilterHandler(key);
};

export const applyFilter = (
  queryContext: Knex.QueryBuilder,
  type: DatabaseType,
  filter:
    | Filter
    | DeploymentRequestFilter
    | ServiceInstanceFilter
    | SubscriptionFilter
) => {
  if (!filter.key) return queryContext;
  const f = getFilterHandler(filter.key);
  f.addWhere(queryContext, type, filter.value);
  return queryContext;
};

export const applyFilters = async (
  type: DatabaseType,
  queryContext: Knex.QueryBuilder,
  filters: Filters
) => {
  if (!filters?.length) return queryContext;

  applyFilterJoins(type, queryContext, filters);
  filters.forEach((filter) => applyFilter(queryContext, type, filter));

  return queryContext;
};

export const applySearch = async <T extends object>(
  type: DatabaseType,
  queryContext = db<T>(type),
  searchTerm: string | null | undefined,
  normalizeSearchTerm: boolean = false
) => {
  const columns = await getCachedColumnInfo(type);

  const search: string[] = [];
  if (searchTerm) {
    searchAttributes.forEach((s) => {
      if (columns.includes(s)) {
        search.push(s);
      }
    });
  }

  if (search.length > 0) {
    const normalizedSearchTerm = normalizeSearchTerm
      ? DocumentHelper.normalizeDocumentName(searchTerm ?? undefined)
      : searchTerm;
    const [first, ...others] = search;
    const metaAlias = 'metaSearch';

    const shouldSearchOnDocumentMetadata = type === 'Document';

    queryContext.andWhere((qb) => {
      if (shouldSearchOnDocumentMetadata) {
        qb.orWhereExists(function () {
          this.select(dbRaw('1'))
            .from({ [metaAlias]: 'Document_Metadata' })
            .whereRaw(`"${metaAlias}"."document_id" = "Document"."id"`)
            .andWhereILike(`${metaAlias}.value`, `%${searchTerm}%`);
        });
        qb.orWhereExists(function () {
          this.select(dbRaw('1'))
            .from('Object_UseCase')
            .join('UseCase', 'UseCase.id', '=', 'Object_UseCase.use_case_id')
            .whereRaw('"Object_UseCase"."object_id" = "Document"."id"')
            .andWhereILike('UseCase.name', `%${searchTerm}%`);
        });
      }
      qb.orWhereILike(`${type}.${first}`, `%${normalizedSearchTerm}%`);
      others.forEach((i) =>
        qb.orWhereILike(`${type}.${i}`, `%${normalizedSearchTerm}%`)
      );
    });
  }
};

const collectLogicalFilterLeaves = (expr: LogicalFilterInput): Filter[] => {
  if (expr.leaf) {
    return [expr.leaf];
  }

  if (expr.children?.length) {
    return expr.children.flatMap(collectLogicalFilterLeaves);
  }

  return [];
};

const applyLogicalFilterJoins = (
  type: DatabaseType,
  qb: Knex.QueryBuilder,
  expr: LogicalFilterInput
) => {
  const leaves = collectLogicalFilterLeaves(expr);
  const seenKeys = new Set<string>();

  for (const leaf of leaves) {
    if (!leaf.key || seenKeys.has(leaf.key)) continue;
    seenKeys.add(leaf.key);

    const filter = getFilterHandler(leaf.key);
    if (filter.addJoin) {
      filter.addJoin(qb, type);
    }
  }
};

const applyLogicalFilterWhere = (
  type: DatabaseType,
  qb: Knex.QueryBuilder,
  logicalFilter: LogicalFilterInput
) => {
  if (logicalFilter.leaf) {
    const filter = getFilterHandler(logicalFilter.leaf.key);
    filter.addWhere(qb, type, logicalFilter.leaf.value);
    return;
  }
  if (logicalFilter.operator && logicalFilter.children?.length) {
    qb.where((groupQb) => {
      const children = logicalFilter.children ?? [];
      children.forEach((child, index) => {
        if (index === 0) {
          groupQb.where((subQb) => {
            applyLogicalFilterWhere(type, subQb, child);
          });
          return;
        }

        if (logicalFilter.operator === LogicalOperator.Or) {
          groupQb.orWhere((subQb) => {
            applyLogicalFilterWhere(type, subQb, child);
          });
        } else {
          groupQb.andWhere((subQb) => {
            applyLogicalFilterWhere(type, subQb, child);
          });
        }
      });
    });
  }
};

export const applyLogicalFilter = (
  type: DatabaseType,
  qb: Knex.QueryBuilder,
  logicalFilter?: LogicalFilterInput
) => {
  if (!logicalFilter) return qb;
  applyLogicalFilterJoins(type, qb, logicalFilter);
  applyLogicalFilterWhere(type, qb, logicalFilter);
};

export const paginate = async <T extends object, U>(
  type: DatabaseType,
  pagination: Pagination,
  opts: Partial<QueryOpts> = {},
  queryContext = db<T>(type)
) => {
  const {
    first,
    after,
    orderMode,
    orderBy,
    filters,
    logicalFilters,
    searchTerm,
  } = pagination;
  const currentOffset = after ? Number(atob(after)) : 0;
  queryContext.queryContext({
    ...queryContext.queryContext(),
    ...pagination,
    connection: true,
  });

  applyLogicalFilter(type, queryContext, logicalFilters ?? undefined);

  if (filters) {
    await applyFilters(type, queryContext, filters);
  }

  await applySearch(
    type,
    queryContext,
    searchTerm ?? undefined,
    opts.normalizeSearchTerm
  );

  const totalCountQuery = queryContext
    .clone()
    .clearOrder()
    .clearSelect()
    .clearGroup()
    .countDistinct(`${type}.id as totalCount`)
    .first();

  if (orderBy) {
    queryContext.orderBy([
      { column: orderBy, order: orderMode ?? undefined, nulls: 'last' },
    ]);
  }
  queryContext.offset(currentOffset).select(`${type}.*`);

  if (first != null) {
    queryContext.limit(first);
  }

  const [query, { totalCount }] = await Promise.all([
    queryContext,
    totalCountQuery,
  ]);
  return dbConnections(
    query,
    after ?? undefined,
    first ?? undefined,
    totalCount ?? 0
  ) as U;
};

export const dbMigration = {
  migrate: () => database.migrate.latest(),
  version: () => database.migrate.currentVersion(),
  seed: () => database.seed.run(),
};

export default config;
