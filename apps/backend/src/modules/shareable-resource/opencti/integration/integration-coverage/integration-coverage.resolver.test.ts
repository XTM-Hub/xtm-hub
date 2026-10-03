import { describe, expect, it, vi } from 'vitest';
import {
  contextSimpleUserFiligran2,
  GRAPHQL_RESOLVE_INFO,
} from '../../../../../../tests/tests.const';
import {
  IntegrationCoverageSearchResult,
  IntegrationType,
} from '../../../../../__generated__/resolvers-types';
import {
  BadRequestErrorCode,
  UnknownErrorCode,
} from '../../../../../utils/error/error.code';
import { IntegrationCoverageApp } from './integration-coverage.app';
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

describe('integration-coverage.resolver', () => {
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
