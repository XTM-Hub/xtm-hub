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

describe('connector type field resolvers', () => {
  const huntConfigSchema = JSON.stringify({
    type: 'object',
    properties: {
      CONNECTOR_SCOPE: { type: 'string', default: 'splunk' },
    },
  });

  const resolveConnectorField = (
    field: 'connector_type' | 'hunt_platform',
    connector: Record<string, unknown>
  ) =>
    (
      integrationResolver.Connector as unknown as Record<
        typeof field,
        (parent: Connector) => string | null
      >
    )[field](connector as unknown as Connector);

  it.each`
    imageType                | expected
    ${'INTERNAL_HUNT'}       | ${'INTERNAL_HUNT'}
    ${'internal_enrichment'} | ${'INTERNAL_ENRICHMENT'}
    ${'SOMETHING_ELSE'}      | ${null}
    ${undefined}             | ${null}
  `(
    'should resolve connector_type $expected from image_type $imageType',
    ({ imageType, expected }) => {
      expect(
        resolveConnectorField('connector_type', { image_type: imageType })
      ).toBe(expected);
    }
  );

  it('should resolve the hunted platform of a hunt connector', () => {
    expect(
      resolveConnectorField('hunt_platform', {
        image_type: 'INTERNAL_HUNT',
        config_schema: huntConfigSchema,
      })
    ).toBe('splunk');
  });

  it('should not resolve a hunted platform for another connector type', () => {
    expect(
      resolveConnectorField('hunt_platform', {
        image_type: 'EXTERNAL_IMPORT',
        config_schema: huntConfigSchema,
      })
    ).toBeNull();
  });
});
