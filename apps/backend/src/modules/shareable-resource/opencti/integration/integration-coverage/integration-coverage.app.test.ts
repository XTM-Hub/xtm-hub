import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../../../tests/helper/test.helper';
import { TEST_ORGANIZATIONS } from '../../../../../../tests/tests.const';
import {
  DocumentMetadataKeyCode,
  IntegrationType,
  LicenseType,
} from '../../../../../__generated__/resolvers-types';
import type Document from '../../../../../model/kanel/public/Document';
import type { DocumentMetadataKey } from '../../../../../model/kanel/public/DocumentMetadata';
import type { ServiceInstanceId } from '../../../../../model/kanel/public/ServiceInstance';
import { BadRequestErrorCode } from '../../../../../utils/error/error.code';
import { isFeatureEnabled } from '../../../../../utils/feature-flag.util';
import { DocumentApp } from '../../../../document/document.app';
import { DocumentDomain } from '../../../../document/domain/document.domain';
import { TelemetryApp } from '../../../../telemetry/telemetry.app';
import {
  TAG_DECOUPLING,
  TAG_LATEST,
} from '../../../manifest-fragment/manifest-fragment.helper';
import {
  INTEGRATION_SERVICE_INSTANCE_ID,
  OPENCTI_INTEGRATION_DOCUMENT_TYPE,
} from '../integration.model';
import { IntegrationCoverageApp } from './integration-coverage.app';
import {
  EMPTY_COVERAGE_FACETS,
  IntegrationCoverageDomain,
} from './integration-coverage.domain';
import { IntegrationCoverageHelper } from './integration-coverage.helper';
import { StoredIntegrationCoverage } from './integration-coverage.model';

vi.mock('../../../../../utils/feature-flag.util', () => ({
  isFeatureEnabled: vi.fn(() => false),
}));

const MALWARE = 'Malware';
const INDICATOR = 'Indicator';
const VULNERABILITY = 'Vulnerability';
const FINANCE = 'Finance';
const FRANCE = 'France';
const VENDOR_URL = 'https://vendor.example.com';

const declared = (
  overrides: Partial<StoredIntegrationCoverage> = {}
): StoredIntegrationCoverage => ({
  object_types: [],
  sectors: [],
  regions: [],
  inferred: false,
  ...overrides,
});

const inferred = (
  overrides: Partial<StoredIntegrationCoverage> = {}
): StoredIntegrationCoverage => ({ ...declared(overrides), inferred: true });

const createIntegration = async ({
  slug,
  name = slug,
  description = null,
  integrationType = IntegrationType.Connector,
  coverage,
  active = true,
  serviceInstanceId = INTEGRATION_SERVICE_INSTANCE_ID,
  licenseType,
  verified,
  tags = [],
}: {
  slug: string;
  name?: string;
  description?: string | null;
  integrationType?: IntegrationType;
  coverage?: StoredIntegrationCoverage;
  active?: boolean;
  serviceInstanceId?: ServiceInstanceId;
  licenseType?: LicenseType;
  verified?: boolean;
  tags?: string[];
}): Promise<Document> => {
  const document = await TestHelper.document.create({
    name,
    slug,
    description,
    short_description: `${name} short description`,
    type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
    active,
    service_instance_id: serviceInstanceId,
    tags,
  });
  const entries = [
    { key: DocumentMetadataKeyCode.IntegrationType, value: integrationType },
    ...(licenseType
      ? [{ key: DocumentMetadataKeyCode.LicenseType, value: licenseType }]
      : []),
    ...(verified !== undefined
      ? [{ key: DocumentMetadataKeyCode.Verified, value: String(verified) }]
      : []),
    ...(coverage ? IntegrationCoverageHelper.toMetadataEntries(coverage) : []),
  ];
  for (const { key, value } of entries) {
    await TestHelper.documentMetadata.create({
      document_id: document.id,
      key: key as DocumentMetadataKey,
      value,
    });
  }
  return document;
};

const loadStoredCoverage = (document: Document) =>
  IntegrationCoverageDomain.loadStoredCoverage(document.id);

const cleanDatabase = async () => {
  await TestHelper.objectUseCase.delete({});
  await TestHelper.objectSolutionCategory.delete({});
  await TestHelper.documentMetadata.delete({});
  await TestHelper.documentChildren.delete({});
  await TestHelper.document.delete({});
};

describe('integrationCoverageApp', () => {
  const createdServiceInstanceIds: ServiceInstanceId[] = [];

  beforeEach(async () => {
    await cleanDatabase();
    vi.mocked(isFeatureEnabled).mockReturnValue(false);
    vi.spyOn(TelemetryApp, 'countEventsByDocumentIds').mockResolvedValue(
      new Map()
    );
  });

  afterEach(async () => {
    await cleanDatabase();
    for (const id of createdServiceInstanceIds.splice(0)) {
      await TestHelper.serviceInstance.delete({ id });
    }
  });

  describe('searchIntegrationsByCoverage', () => {
    it('should rank declared coverage above inferred coverage and drop integrations scoring 0', async () => {
      // Given
      await createIntegration({
        slug: 'full-declared',
        coverage: declared({ object_types: [MALWARE, INDICATOR] }),
      });
      await createIntegration({
        slug: 'full-inferred',
        coverage: inferred({ object_types: [MALWARE, INDICATOR] }),
      });
      await createIntegration({
        slug: 'half-declared',
        coverage: declared({ object_types: [MALWARE] }),
      });
      await createIntegration({
        slug: 'unrelated',
        coverage: declared({ object_types: [VULNERABILITY] }),
      });

      // When
      const { matches } =
        await IntegrationCoverageApp.searchIntegrationsByCoverage({
          objectTypes: ['malware', 'indicator'],
        });

      // Then
      expect(matches.map(({ slug, score }) => ({ slug, score }))).toEqual([
        { slug: 'full-declared', score: 1 },
        { slug: 'full-inferred', score: 0.6 },
        { slug: 'half-declared', score: 0.5 },
      ]);
    });

    it('should match any requested region with a Global integration', async () => {
      // Given
      await createIntegration({
        slug: 'global-feed',
        coverage: declared({ regions: ['Global'], sectors: [FINANCE] }),
      });

      // When
      const { matches } =
        await IntegrationCoverageApp.searchIntegrationsByCoverage({
          regions: [FRANCE],
          sectors: ['finance'],
        });

      // Then
      expect(matches).toEqual([
        expect.objectContaining({
          slug: 'global-feed',
          score: 1,
          matched_regions: [FRANCE],
          matched_sectors: [FINANCE],
        }),
      ]);
    });

    it('should rank the same matches without computing the facets when they are not requested', async () => {
      // Given
      await createIntegration({
        slug: 'global-feed-without-facets',
        coverage: declared({ regions: ['Global'], sectors: [FINANCE] }),
      });
      const input = { regions: [FRANCE], sectors: ['finance'] };

      // When
      const withFacets =
        await IntegrationCoverageApp.searchIntegrationsByCoverage(input);
      const withoutFacets =
        await IntegrationCoverageApp.searchIntegrationsByCoverage(input, {
          withFacets: false,
        });

      // Then
      expect(withoutFacets.matches).toEqual(withFacets.matches);
      expect(withFacets.facets.sector.length).toBeGreaterThan(0);
      expect(withoutFacets.facets).toEqual(EMPTY_COVERAGE_FACETS);
    });

    it('should only expose active integrations of the public integrations service', async () => {
      // Given
      const otherServiceInstance = await TestHelper.serviceInstance.create({
        name: `coverage-other-${uuidv4()}`,
        public: true,
      });
      createdServiceInstanceIds.push(otherServiceInstance.id);
      await createIntegration({
        slug: 'visible',
        coverage: declared({ object_types: [MALWARE] }),
      });
      await createIntegration({
        slug: 'inactive',
        active: false,
        coverage: declared({ object_types: [MALWARE] }),
      });
      await createIntegration({
        slug: 'other-service',
        serviceInstanceId: otherServiceInstance.id,
        coverage: declared({ object_types: [MALWARE] }),
      });

      // When
      const { matches } =
        await IntegrationCoverageApp.searchIntegrationsByCoverage({
          objectTypes: [MALWARE],
        });

      // Then
      expect(matches.map(({ slug }) => slug)).toEqual(['visible']);
    });

    it('should only expose the latest decoupled connector version when decoupling is enabled', async () => {
      // Given
      vi.mocked(isFeatureEnabled).mockReturnValue(true);
      await createIntegration({
        slug: 'decoupled-latest',
        tags: [TAG_DECOUPLING, TAG_LATEST],
        coverage: declared({ object_types: [MALWARE] }),
      });
      await createIntegration({
        slug: 'decoupled-older',
        tags: [TAG_DECOUPLING],
        coverage: declared({ object_types: [MALWARE] }),
      });

      // When
      const { matches } =
        await IntegrationCoverageApp.searchIntegrationsByCoverage({
          objectTypes: [MALWARE],
        });

      // Then
      expect(matches.map(({ slug }) => slug)).toEqual(['decoupled-latest']);
    });

    it('should restrict the results to the requested integration types', async () => {
      // Given
      await createIntegration({
        slug: 'connector',
        coverage: declared({ object_types: [MALWARE] }),
      });
      await createIntegration({
        slug: 'taxii',
        integrationType: IntegrationType.TaxiiFeed,
        coverage: declared({ object_types: [MALWARE] }),
      });

      // When
      const { matches } =
        await IntegrationCoverageApp.searchIntegrationsByCoverage({
          objectTypes: [MALWARE],
          integrationTypes: [IntegrationType.TaxiiFeed],
        });

      // Then
      expect(matches.map(({ slug }) => slug)).toEqual(['taxii']);
    });

    it('should expose the integration fields of each match', async () => {
      // Given
      const connector = await createIntegration({
        slug: 'detailed-connector',
        licenseType: LicenseType.Free,
        verified: true,
        coverage: declared({ object_types: [MALWARE], regions: [FRANCE] }),
      });
      await createIntegration({
        slug: 'detailed-feed',
        integrationType: IntegrationType.CsvFeed,
        coverage: declared({ object_types: [MALWARE] }),
      });

      // When
      const { matches } =
        await IntegrationCoverageApp.searchIntegrationsByCoverage({
          objectTypes: [MALWARE],
        });

      // Then
      expect(matches).toEqual([
        {
          id: connector.id,
          slug: 'detailed-connector',
          name: 'detailed-connector',
          short_description: 'detailed-connector short description',
          integration_type: IntegrationType.Connector,
          license_type: LicenseType.Free,
          verified: true,
          manager_supported: false,
          object_types: [MALWARE],
          sectors: [],
          regions: [FRANCE],
          coverage_inferred: false,
          matched_object_types: [MALWARE],
          matched_sectors: [],
          matched_regions: [],
          score: 1,
        },
        expect.objectContaining({
          slug: 'detailed-feed',
          integration_type: IntegrationType.CsvFeed,
          verified: null,
          manager_supported: null,
          license_type: null,
        }),
      ]);
    });

    it('should break score ties by download count, then by name', async () => {
      // Given
      await createIntegration({
        slug: 'alpha',
        coverage: declared({ object_types: [MALWARE] }),
      });
      const popular = await createIntegration({
        slug: 'zulu',
        coverage: declared({ object_types: [MALWARE] }),
      });
      await createIntegration({
        slug: 'bravo',
        coverage: declared({ object_types: [MALWARE] }),
      });
      vi.spyOn(TelemetryApp, 'countEventsByDocumentIds').mockResolvedValue(
        new Map([[popular.id, 12]])
      );

      // When
      const { matches } =
        await IntegrationCoverageApp.searchIntegrationsByCoverage({
          objectTypes: [MALWARE],
        });

      // Then
      expect(matches.map(({ slug }) => slug)).toEqual([
        'zulu',
        'alpha',
        'bravo',
      ]);
    });

    it('should rank ties by name when download counts are unavailable', async () => {
      // Given
      await createIntegration({
        slug: 'zulu',
        coverage: declared({ object_types: [MALWARE] }),
      });
      await createIntegration({
        slug: 'alpha',
        coverage: declared({ object_types: [MALWARE] }),
      });
      vi.spyOn(TelemetryApp, 'countEventsByDocumentIds').mockRejectedValue(
        new Error('Elasticsearch is unreachable')
      );

      // When
      const { matches } =
        await IntegrationCoverageApp.searchIntegrationsByCoverage({
          objectTypes: [MALWARE],
        });

      // Then
      expect(matches.map(({ slug }) => slug)).toEqual(['alpha', 'zulu']);
    });

    it('should run a plain search when no facet is requested', async () => {
      // Given
      await createIntegration({ slug: 'acme-threat-feed', name: 'Acme feed' });
      await createIntegration({ slug: 'other-connector', name: 'Other one' });

      // When
      const { matches } =
        await IntegrationCoverageApp.searchIntegrationsByCoverage({
          searchTerm: 'acme',
        });

      // Then
      expect(
        matches.map(({ slug, score, coverage_inferred }) => ({
          slug,
          score,
          coverage_inferred,
        }))
      ).toEqual([
        { slug: 'acme-threat-feed', score: 0, coverage_inferred: true },
      ]);
    });

    it('should return at most `first` matches', async () => {
      // Given
      for (const slug of ['first-a', 'first-b', 'first-c']) {
        await createIntegration({
          slug,
          coverage: declared({ object_types: [MALWARE] }),
        });
      }

      // When
      const { matches } =
        await IntegrationCoverageApp.searchIntegrationsByCoverage({
          objectTypes: [MALWARE],
          first: 2,
        });

      // Then
      expect(matches.map(({ slug }) => slug)).toEqual(['first-a', 'first-b']);
    });

    it('should compute the facets over the whole matched population', async () => {
      // Given
      await createIntegration({
        slug: 'facet-one',
        coverage: declared({ object_types: [MALWARE], sectors: [FINANCE] }),
      });
      await createIntegration({
        slug: 'facet-two',
        integrationType: IntegrationType.TaxiiFeed,
        coverage: declared({ object_types: [MALWARE, INDICATOR] }),
      });
      await createIntegration({
        slug: 'facet-unmatched',
        coverage: declared({ object_types: [VULNERABILITY] }),
      });

      // When
      const { facets } =
        await IntegrationCoverageApp.searchIntegrationsByCoverage({
          objectTypes: [MALWARE],
          first: 1,
        });

      // Then
      expect({
        object_type: facets.object_type,
        sector: facets.sector,
        integration_type: facets.integration_type,
      }).toEqual({
        object_type: [
          { value: MALWARE, count: 2 },
          { value: INDICATOR, count: 1 },
        ],
        sector: [{ value: FINANCE, count: 1 }],
        integration_type: [
          { value: IntegrationType.Connector, count: 1 },
          { value: IntegrationType.TaxiiFeed, count: 1 },
        ],
      });
    });

    it('should reject an input above the list bounds', async () => {
      // Given
      const objectTypes = Array.from({ length: 51 }, (_, index) => `t${index}`);

      // When
      const call = IntegrationCoverageApp.searchIntegrationsByCoverage({
        objectTypes,
      });

      // Then
      await expect(call).rejects.toThrow(
        BadRequestErrorCode.InvalidCoverageSearchInput
      );
    });
  });

  describe('refreshInferredCoverage', () => {
    it('should infer the coverage of integrations without stored coverage', async () => {
      // Given
      const document = await createIntegration({
        slug: 'legacy-malware-feed',
        name: 'Legacy malware feed',
      });

      // When
      await IntegrationCoverageApp.refreshInferredCoverage();

      // Then
      expect(await loadStoredCoverage(document)).toEqual(
        inferred({ object_types: [MALWARE] })
      );
    });

    it('should never overwrite a declared coverage', async () => {
      // Given
      const coverage = declared({ sectors: [FINANCE] });
      const document = await createIntegration({
        slug: 'declared-malware-feed',
        name: 'Declared malware feed',
        coverage,
      });

      // When
      await IntegrationCoverageApp.refreshInferredCoverage();

      // Then
      expect(await loadStoredCoverage(document)).toEqual(coverage);
    });

    it('should keep a coverage declared after the refresh read its batch', async () => {
      // Given - the refresh computed an inferred coverage, then an admin declared one
      const coverage = declared({ regions: [FRANCE] });
      const document = await createIntegration({
        slug: 'declared-during-refresh',
        name: 'Malware feed',
        coverage,
      });

      // When - the stale inferred write lands after the declaration
      const written = await IntegrationCoverageDomain.writeInferredCoverage(
        [document.id],
        async () => [
          {
            documentId: document.id,
            coverage: inferred({ object_types: [MALWARE] }),
          },
        ]
      );

      // Then
      expect({ written, coverage: await loadStoredCoverage(document) }).toEqual(
        {
          written: 0,
          coverage,
        }
      );
    });

    it('should infer again from the current text when the integration changed after the refresh read', async () => {
      // Given - the refresh read the integration, then its text changed
      const document = await createIntegration({
        slug: 'renamed-during-refresh',
        name: 'Malware feed',
        coverage: inferred({ object_types: [MALWARE] }),
      });
      await TestHelper.document.update(
        { id: document.id },
        { name: 'Vulnerability feed' }
      );
      const seenNames: string[] = [];

      // When
      const written = await IntegrationCoverageDomain.writeInferredCoverage(
        [document.id],
        async (rows) =>
          rows.map((row) => {
            seenNames.push(row.name);
            return {
              documentId: row.id,
              coverage: inferred({ object_types: [VULNERABILITY] }),
            };
          })
      );

      // Then
      expect({
        written,
        seenNames,
        coverage: await loadStoredCoverage(document),
      }).toEqual({
        written: 1,
        seenNames: ['Vulnerability feed'],
        coverage: inferred({ object_types: [VULNERABILITY] }),
      });
    });

    it('should skip an integration deleted after the refresh read and write the others', async () => {
      // Given
      const kept = await createIntegration({
        slug: 'kept-during-refresh',
        name: 'Malware feed',
      });
      const deletedId = uuidv4();

      // When
      const written = await IntegrationCoverageDomain.writeInferredCoverage(
        [kept.id, deletedId],
        async () => [
          {
            documentId: deletedId,
            coverage: inferred({ object_types: [MALWARE] }),
          },
          {
            documentId: kept.id,
            coverage: inferred({ object_types: [MALWARE] }),
          },
        ]
      );

      // Then
      expect({ written, coverage: await loadStoredCoverage(kept) }).toEqual({
        written: 1,
        coverage: inferred({ object_types: [MALWARE] }),
      });
    });

    it('should refresh a stale inferred coverage and be idempotent', async () => {
      // Given
      const document = await createIntegration({
        slug: 'stale-feed',
        name: 'Vulnerability feed',
        coverage: inferred({ object_types: [MALWARE] }),
      });

      // When
      const firstRun = await IntegrationCoverageApp.refreshInferredCoverage();
      const secondRun = await IntegrationCoverageApp.refreshInferredCoverage();

      // Then
      expect({
        coverage: await loadStoredCoverage(document),
        firstRunUpdated: firstRun.updated,
        secondRunUpdated: secondRun.updated,
      }).toEqual({
        coverage: inferred({ object_types: [VULNERABILITY] }),
        firstRunUpdated: 1,
        secondRunUpdated: 0,
      });
    });
  });

  describe('document write paths', () => {
    const thirdPartyMetadata = [
      {
        key: DocumentMetadataKeyCode.IntegrationType,
        value: IntegrationType.ThirdPartyIntegration,
      },
      { key: DocumentMetadataKeyCode.VendorUrl, value: VENDOR_URL },
    ];

    const createThirdPartyIntegration = (
      overrides: {
        name?: string;
        covered_object_types?: string[];
        covered_sectors?: string[];
        covered_regions?: string[];
      } = {}
    ) =>
      DocumentApp.createDocument({
        input: {
          name: 'Acme platform',
          slug: `acme-platform-${uuidv4()}`,
          short_description: 'Acme',
          description: 'Acme',
          active: true,
          use_cases: [],
          solution_categories: [],
          uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
          ...overrides,
        },
        metadata: thirdPartyMetadata,
        serviceInstanceId: INTEGRATION_SERVICE_INSTANCE_ID,
      });

    const updateThirdPartyIntegration = (
      document: Document,
      input: {
        name?: string;
        covered_object_types?: string[];
        covered_sectors?: string[];
        covered_regions?: string[];
        coverage_confirmed?: boolean;
      },
      metadata = thirdPartyMetadata
    ) =>
      DocumentApp.updateDocument({
        parentDocumentId: document.id,
        serviceInstanceId: INTEGRATION_SERVICE_INSTANCE_ID,
        metadata,
        input,
        existingImageIds: [],
      });

    it('should store the coverage declared by an admin at creation', async () => {
      // Given / When
      const document = await createThirdPartyIntegration({
        covered_object_types: ['malware'],
        covered_regions: [FRANCE],
      });

      // Then
      expect(await loadStoredCoverage(document)).toEqual(
        declared({ object_types: [MALWARE], regions: [FRANCE] })
      );
    });

    it('should infer the coverage at creation when none is declared', async () => {
      // Given / When
      const document = await createThirdPartyIntegration({
        name: 'Acme ransomware tracker',
      });

      // Then
      expect(await loadStoredCoverage(document)).toEqual(
        inferred({ object_types: [MALWARE, 'Intrusion-Set'] })
      );
    });

    it('should keep the admin coverage when an update does not submit coverage', async () => {
      // Given
      const document = await createThirdPartyIntegration({
        covered_sectors: [FINANCE],
      });

      // When
      await updateThirdPartyIntegration(document, {
        name: 'Acme malware platform',
      });

      // Then
      expect(await loadStoredCoverage(document)).toEqual(
        declared({ sectors: [FINANCE] })
      );
    });

    it.each([
      ['keep it inferred without confirmation', false, false],
      ['declare it when the admin confirms it', true, true],
    ])(
      'should, for inferred values submitted unchanged, %s',
      async (_description, coverageConfirmed, expectDeclared) => {
        // Given
        const document = await createThirdPartyIntegration({
          name: 'Acme ransomware tracker',
        });
        const before = await loadStoredCoverage(document);

        // When
        await updateThirdPartyIntegration(document, {
          covered_object_types: before!.object_types,
          covered_sectors: before!.sectors,
          covered_regions: before!.regions,
          coverage_confirmed: coverageConfirmed,
        });

        // Then
        const { object_types, sectors, regions } = before!;
        expect(await loadStoredCoverage(document)).toEqual(
          expectDeclared
            ? declared({ object_types, sectors, regions })
            : inferred({ object_types, sectors, regions })
        );
      }
    );

    it('should return to inference when an update clears every list', async () => {
      // Given
      const document = await createThirdPartyIntegration({
        covered_sectors: [FINANCE],
      });

      // When
      await updateThirdPartyIntegration(document, {
        name: 'Acme malware platform',
        covered_object_types: [],
        covered_sectors: [],
        covered_regions: [],
      });

      // Then
      expect(await loadStoredCoverage(document)).toEqual(
        inferred({ object_types: [MALWARE] })
      );
    });

    it('should infer from the text read under the document lock, not from the text read before it', async () => {
      // Given - another admin renamed the integration after this update first read it
      const document = await createThirdPartyIntegration({
        name: 'Malware feed',
      });
      const staleRead = await DocumentDomain.loadDocumentBy({
        id: document.id,
      });
      await TestHelper.document.update(
        { id: document.id },
        { name: 'Vulnerability feed' }
      );
      const loadSpy = vi
        .spyOn(DocumentDomain, 'loadDocumentBy')
        .mockResolvedValueOnce(staleRead);

      // When - the update keeps the name and returns the coverage to inference
      await updateThirdPartyIntegration(document, {
        covered_object_types: [],
        covered_sectors: [],
        covered_regions: [],
      });
      loadSpy.mockRestore();

      // Then
      expect(await loadStoredCoverage(document)).toEqual(
        inferred({ object_types: [VULNERABILITY] })
      );
    });

    it('should ignore coverage metadata sent directly by a client', async () => {
      // Given
      const document = await createThirdPartyIntegration();

      // When
      await updateThirdPartyIntegration(document, {}, [
        ...thirdPartyMetadata,
        {
          key: DocumentMetadataKeyCode.CoveredObjectTypes,
          value: 'not-json',
        },
        { key: DocumentMetadataKeyCode.CoverageInferred, value: 'false' },
      ]);

      // Then
      expect(await loadStoredCoverage(document)).toEqual(inferred());
    });
  });
});
