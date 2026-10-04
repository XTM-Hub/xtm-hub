import { FieldNode, GraphQLResolveInfo, Kind } from 'graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  contextSimpleUserFiligran2,
  GRAPHQL_RESOLVE_INFO,
} from '../../../../../../tests/tests.const';
import {
  IntegrationCoverageSearchResult,
  IntegrationType,
} from '../../../../../__generated__/resolvers-types';
import type { PortalContext } from '../../../../../model/portal-context';
import {
  BadRequestErrorCode,
  TooManyRequestsErrorCode,
  UnknownErrorCode,
} from '../../../../../utils/error/error.code';
import { IntegrationCoverageApp } from './integration-coverage.app';
import {
  COVERAGE_FACETS_RATE_LIMIT,
  IntegrationCoverageRateLimit,
} from './integration-coverage.rate-limit';
import resolver from './integration-coverage.resolver';

const EMPTY_FACETS = {
  integration_type: [],
  license_type: [],
  manager_supported: [],
  verified: [],
  product_version: [],
  solution_category: [],
  use_case: [],
  entity_type: [],
  object_type: [],
  sector: [],
  region: [],
};

const callIntegrationsByCoverage = (
  input: Parameters<
    typeof IntegrationCoverageApp.searchIntegrationsByCoverage
  >[0]
) =>
  resolver.Query!.integrationsByCoverage!(
    {},
    { input },
    contextSimpleUserFiligran2,
    GRAPHQL_RESOLVE_INFO
  );

const field = (name: string, selections: string[] = []): FieldNode => ({
  kind: Kind.FIELD,
  name: { kind: Kind.NAME, value: name },
  ...(selections.length > 0
    ? {
        selectionSet: {
          kind: Kind.SELECTION_SET,
          selections: selections.map((selection) => field(selection)),
        },
      }
    : {}),
});

/** Resolve info of a query selecting the matches and, when given, these facets. */
const infoSelecting = (facets: string[] = []) =>
  ({
    fieldNodes: [
      {
        ...field('integrationsByCoverage'),
        selectionSet: {
          kind: Kind.SELECTION_SET,
          selections: [
            field('matches', ['id']),
            ...(facets.length > 0 ? [field('facets', facets)] : []),
          ],
        },
      },
    ],
    fragments: {},
  }) as unknown as GraphQLResolveInfo;

const callSelecting = (context: PortalContext, info: GraphQLResolveInfo) =>
  resolver.Query!.integrationsByCoverage!(
    {},
    { input: { objectTypes: ['Malware'] } },
    context,
    info
  );

describe('integration-coverage.resolver', () => {
  beforeEach(() => {
    IntegrationCoverageRateLimit.reset();
  });

  it('should delegate integrationsByCoverage to the app layer', async () => {
    // Given
    const expected: IntegrationCoverageSearchResult = {
      matches: [
        {
          id: 'document-id',
          slug: 'malware-connector',
          name: 'Malware connector',
          integration_type: IntegrationType.Connector,
          object_types: ['Malware'],
          sectors: [],
          regions: [],
          coverage_inferred: false,
          matched_object_types: ['Malware'],
          matched_sectors: [],
          matched_regions: [],
          score: 1,
        },
      ],
      facets: EMPTY_FACETS,
      truncated: false,
    };
    vi.spyOn(
      IntegrationCoverageApp,
      'searchIntegrationsByCoverage'
    ).mockResolvedValue(expected);

    // When
    const result = await callIntegrationsByCoverage({
      objectTypes: ['Malware'],
    });

    // Then
    expect(result).toEqual(expected);
  });

  it('should compute only the facets the query selects', async () => {
    // Given
    const search = vi
      .spyOn(IntegrationCoverageApp, 'searchIntegrationsByCoverage')
      .mockResolvedValue({
        matches: [],
        facets: EMPTY_FACETS,
        truncated: false,
      });

    // When
    await callSelecting(contextSimpleUserFiligran2, infoSelecting());
    await callSelecting(
      contextSimpleUserFiligran2,
      infoSelecting(['sector', 'region', '__typename'])
    );

    // Then
    expect(search).toHaveBeenNthCalledWith(1, expect.anything(), {
      facetKeys: [],
    });
    expect(search).toHaveBeenNthCalledWith(2, expect.anything(), {
      facetKeys: ['sector', 'region'],
    });
  });

  it('should limit the searches with facets of one caller, not the others or the searches without facets', async () => {
    // Given
    vi.spyOn(
      IntegrationCoverageApp,
      'searchIntegrationsByCoverage'
    ).mockResolvedValue({
      matches: [],
      facets: EMPTY_FACETS,
      truncated: false,
    });
    const anonymous = (ip: string) =>
      ({ req: { ip } }) as unknown as PortalContext;
    const withFacets = infoSelecting(['sector']);
    for (let i = 0; i < COVERAGE_FACETS_RATE_LIMIT.limit; i += 1) {
      await callSelecting(anonymous('203.0.113.7'), withFacets);
    }

    // When
    const limited = callSelecting(anonymous('203.0.113.7'), withFacets);

    // Then
    await expect(limited).rejects.toMatchObject({
      message: TooManyRequestsErrorCode.CoverageSearchRateLimited,
      data: expect.objectContaining({ http_status: 429 }),
      extensions: expect.objectContaining({ http: { status: 429 } }),
    });
    await expect(
      callSelecting(anonymous('203.0.113.7'), infoSelecting())
    ).resolves.toBeDefined();
    await expect(
      callSelecting(anonymous('198.51.100.20'), withFacets)
    ).resolves.toBeDefined();
    await expect(
      callSelecting(contextSimpleUserFiligran2, withFacets)
    ).resolves.toBeDefined();
  });

  it('should surface a validation failure as a bad request', async () => {
    // Given
    const tooLong = 'x'.repeat(129);

    // When
    const call = callIntegrationsByCoverage({ sectors: [tooLong] });

    // Then
    await expect(call).rejects.toMatchObject({
      message: BadRequestErrorCode.InvalidCoverageSearchInput,
      data: expect.objectContaining({ http_status: 400 }),
    });
  });

  it('should map an unexpected failure to the coverage search error', async () => {
    // Given
    vi.spyOn(
      IntegrationCoverageApp,
      'searchIntegrationsByCoverage'
    ).mockRejectedValue(new Error('database is down'));

    // When
    const call = callIntegrationsByCoverage({ objectTypes: ['Malware'] });

    // Then
    await expect(call).rejects.toMatchObject({
      message: UnknownErrorCode.IntegrationCoverageSearchError,
    });
  });
});
