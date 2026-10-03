import { v4 as uuidv4 } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import {
  contextSimpleUserFiligran2,
  GRAPHQL_RESOLVE_INFO,
} from '../../../../../tests/tests.const';
import {
  Connector,
  IntegrationType,
  SolutionCategory,
} from '../../../../__generated__/resolvers-types';
import { logApp } from '../../../../utils/app-logger.util';
import { Integration } from './integration.model';
import integrationResolver from './integration.resolver';

type IntegrationResolveTypeFn = (feed: Integration) => string | undefined;

const getResolveType = (): IntegrationResolveTypeFn =>
  (
    integrationResolver.Integration as unknown as {
      __resolveType: IntegrationResolveTypeFn;
    }
  ).__resolveType;

describe('integration.__resolveType', () => {
  it.each`
    integrationType                          | expectedTypeName
    ${IntegrationType.Connector}             | ${'Connector'}
    ${IntegrationType.CsvFeed}               | ${'CsvFeed'}
    ${IntegrationType.TaxiiFeed}             | ${'TaxiiFeed'}
    ${IntegrationType.RssFeed}               | ${'RssFeed'}
    ${IntegrationType.Stream}                | ${'Stream'}
    ${IntegrationType.ThirdPartyIntegration} | ${'ThirdPartyIntegration'}
  `(
    'should resolve $integrationType to $expectedTypeName',
    ({ integrationType, expectedTypeName }) => {
      const feed = {
        integration_type: integrationType,
        id: uuidv4(),
      } as unknown as Integration;

      const result = getResolveType()(feed);

      expect(result).toBe(expectedTypeName);
    }
  );

  it('should call logApp.error and return undefined for unknown integration type', () => {
    const unknownType = 'unknown_type' as IntegrationType;
    const integrationId = uuidv4();
    const feed = {
      integration_type: unknownType,
      id: integrationId,
    } as unknown as Integration;
    vi.spyOn(logApp, 'error').mockImplementation(() => undefined);

    const result = getResolveType()(feed);

    expect(logApp.error).toHaveBeenCalledWith(
      `Unknown resolve type for integration ${integrationId} and integration type ${unknownType}`
    );
    expect(result).toBeUndefined();
  });
});

describe('integration field resolvers', () => {
  describe('integration.children_documents', () => {
    it('should load children images by document id', async () => {
      const documentId = uuidv4();
      const expected = [{ id: uuidv4() }];
      vi.spyOn(
        contextSimpleUserFiligran2.dataLoaders.document
          .imagesByDocumentIdLoader,
        'load'
      ).mockResolvedValue(
        expected as unknown as Awaited<
          ReturnType<
            typeof contextSimpleUserFiligran2.dataLoaders.document.imagesByDocumentIdLoader.load
          >
        >
      );

      const result = await integrationResolver.Integration!.children_documents!(
        { id: documentId } as unknown as Connector,
        {},
        contextSimpleUserFiligran2,
        GRAPHQL_RESOLVE_INFO
      );

      expect(
        contextSimpleUserFiligran2.dataLoaders.document.imagesByDocumentIdLoader
          .load
      ).toHaveBeenCalledWith(documentId);
      expect(result).toEqual(expected);
    });

    describe('integration.solution_categories', () => {
      it('should load solution categories by document id', async () => {
        const documentId = uuidv4();
        const expected = [
          { id: uuidv4(), name: 'Case Management', product: [] },
        ];
        vi.spyOn(
          contextSimpleUserFiligran2.dataLoaders.document
            .solutionCategoriesByDocumentIdLoader,
          'load'
        ).mockResolvedValue(expected as unknown as SolutionCategory[]);

        const result = await integrationResolver.Integration!
          .solution_categories!(
          { id: documentId } as unknown as Connector,
          {},
          contextSimpleUserFiligran2,
          GRAPHQL_RESOLVE_INFO
        );

        expect(
          contextSimpleUserFiligran2.dataLoaders.document
            .solutionCategoriesByDocumentIdLoader.load
        ).toHaveBeenCalledWith(documentId);
        expect(result).toEqual(expected);
      });
    });
  });
});

describe('integration coverage field resolvers', () => {
  const COVERED_OBJECT_TYPES = ['Malware', 'Indicator'];

  // Parents hold the raw Document_Metadata values, not the GraphQL shape.
  const resolveCoverageField = <
    F extends
      | 'covered_object_types'
      | 'covered_sectors'
      | 'covered_regions'
      | 'coverage_inferred',
  >(
    field: F,
    parent: Record<string, unknown>
  ) =>
    integrationResolver.Integration![field]!(
      parent as unknown as Connector,
      {},
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

  it.each([
    ['covered_object_types' as const],
    ['covered_sectors' as const],
    ['covered_regions' as const],
  ])('should parse the stored JSON list of %s', async (field) => {
    // Given
    const parent = { [field]: JSON.stringify(COVERED_OBJECT_TYPES) };

    // When
    const result = await resolveCoverageField(field, parent);

    // Then
    expect(result).toEqual(COVERED_OBJECT_TYPES);
  });

  it('should resolve an empty list when no coverage is stored', async () => {
    // Given
    const parent = { covered_regions: null };

    // When
    const result = await resolveCoverageField('covered_regions', parent);

    // Then
    expect(result).toEqual([]);
  });

  it.each([
    ['false', false],
    ['true', true],
    [null, true],
  ])(
    'should resolve coverage_inferred %s as %s',
    async (storedValue, expected) => {
      // Given
      const parent = { coverage_inferred: storedValue };

      // When
      const result = await resolveCoverageField('coverage_inferred', parent);

      // Then
      expect(result).toBe(expected);
    }
  );
});
