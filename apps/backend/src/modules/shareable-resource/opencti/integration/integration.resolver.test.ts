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

  describe('connector.product_version', () => {
    it.each`
      product_version | minimum_deployable_version | expected        | description
      ${'1.2.3'}      | ${'1.0.0'}                 | ${'1.2.3'}      | ${'prefers product_version when both are set (legacy connector)'}
      ${null}         | ${'7.260507.0'}            | ${'7.260507.0'} | ${'falls back to minimum_deployable_version when product_version is missing (decoupled/V2 connector)'}
      ${null}         | ${null}                    | ${null}         | ${'resolves to null when neither is set'}
    `(
      'should resolve to $expected: $description',
      ({ product_version, minimum_deployable_version, expected }) => {
        const result = integrationResolver.Connector!.product_version!(
          {
            product_version,
            minimum_deployable_version,
          } as unknown as Connector,
          {},
          contextSimpleUserFiligran2,
          GRAPHQL_RESOLVE_INFO
        );

        expect(result).toBe(expected);
      }
    );
  });
});
