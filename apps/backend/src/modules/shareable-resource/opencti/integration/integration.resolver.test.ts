import { v4 as uuidv4 } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import {
  contextSimpleUserFiligran2,
  GRAPHQL_RESOLVE_INFO,
} from '../../../../../tests/tests.const';
import {
  Connector,
  FeatureFlag,
  IntegrationType,
  SolutionCategory,
} from '../../../../__generated__/resolvers-types';
import { logApp } from '../../../../utils/app-logger.util';
import * as featureFlagUtil from '../../../../utils/feature-flag.util';
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

describe('connector.product_version', () => {
  const resolveProductVersion = (connector: Partial<Connector>) =>
    (
      integrationResolver.Connector!.product_version as unknown as (
        connector: Partial<Connector>
      ) => string | null
    )(connector);

  const connector = {
    product_version: '6.8.4',
    minimum_deployable_version: '6.250101.0',
  };

  it('should return the legacy product_version when decoupling is disabled', () => {
    vi.spyOn(featureFlagUtil, 'isFeatureEnabled').mockReturnValue(false);

    expect(resolveProductVersion(connector)).toBe('6.8.4');
  });

  it('should return the minimum_deployable_version when decoupling is enabled', () => {
    const spy = vi
      .spyOn(featureFlagUtil, 'isFeatureEnabled')
      .mockReturnValue(true);

    expect(resolveProductVersion(connector)).toBe('6.250101.0');
    expect(spy).toHaveBeenCalledWith(FeatureFlag.DecouplingConnectors);
  });

  it('should fall back to product_version when decoupling is enabled but no minimum version exists', () => {
    vi.spyOn(featureFlagUtil, 'isFeatureEnabled').mockReturnValue(true);

    expect(resolveProductVersion({ product_version: '6.8.4' })).toBe('6.8.4');
  });
});
