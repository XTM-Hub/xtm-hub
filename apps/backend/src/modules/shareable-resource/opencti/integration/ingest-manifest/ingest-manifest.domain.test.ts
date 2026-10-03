import { beforeAll, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../../../tests/helper/test.helper';
import {
  TEST_ORGANIZATIONS,
  TEST_USE_CASES,
} from '../../../../../../tests/tests.const';
import { requestContext } from '../../../../../context/request.context';
import {
  SYSTEM_USER_CONTEXT,
  SYSTEM_USER_UUID,
} from '../../../../../portal.const';
import { minioInit } from '../../../../../server/initialize';
import { DocumentChildrenDomain } from '../../../../document/domain/document.children.domain';
import { DocumentDomain } from '../../../../document/domain/document.domain';
import { useCaseDomain } from '../../../../use-case/use-case.domain';
import { IntegrationCoverageDomain } from '../integration-coverage/integration-coverage.domain';
import {
  Connector,
  INTEGRATION_SERVICE_INSTANCE_ID,
} from '../integration.model';
import { IngestManifestDomain } from './ingest-manifest.domain';
import { ManifestInformation } from './ingest-manifest.model';
import sampleExtractedManifest from './test/sample-extracted-manifest.json';

describe('upsertConnectors', () => {
  beforeAll(async () => {
    await minioInit();
  });
  describe('when creating new connectors', () => {
    let result: Connector[];

    beforeAll(async () => {
      requestContext.set({
        user: SYSTEM_USER_CONTEXT.user,
      });
      result = await IngestManifestDomain.upsertConnectors(
        sampleExtractedManifest as ManifestInformation[]
      );
    });

    it('should return an array with correct length', () => {
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(sampleExtractedManifest.length);
    });

    describe('system fields', () => {
      it('should set correct uploader information', () => {
        result.forEach((doc) => {
          expect(doc.uploader_id).toBe(SYSTEM_USER_UUID);
          expect(doc.uploader_organization_id).toBe(
            TEST_ORGANIZATIONS.FILIGRAN.ID
          );
          expect(doc.service_instance_id).toBe(INTEGRATION_SERVICE_INSTANCE_ID);
        });
      });

      it('should set correct document type and status', () => {
        result.forEach((doc) => {
          expect(doc.type).toBe('opencti_integration');
          expect(doc.source_type).toBe('external');
          expect(doc.active).toBe(true);
        });
      });

      it('should set creation timestamp and null update fields', () => {
        result.forEach((doc) => {
          expect(doc.created_at).toBeDefined();
          expect(new Date(doc.created_at)).toBeInstanceOf(Date);
          expect(doc.updated_at).toBeNull();
          expect(doc.updater_id).toBeNull();
          expect(doc.remover_id).toBeNull();
        });
      });

      it('should have null file-related fields', () => {
        result.forEach((doc) => {
          expect(doc.file_name).toBeNull();
          expect(doc.minio_name).toBeNull();
          expect(doc.mime_type).toBeNull();
        });
      });
    });

    describe('manifest content mapping', () => {
      it('should correctly map all manifest fields', () => {
        result.forEach((doc, index) => {
          const expectedManifest = sampleExtractedManifest[index];
          expect(expectedManifest).toBeTruthy();
          if (!expectedManifest) {
            return;
          }

          expect(doc.name).toBe(expectedManifest.name);
          expect(doc.description).toBe(expectedManifest.description);
          expect(doc.short_description).toBe(
            expectedManifest.short_description
          );
          expect(doc.slug).toBe(expectedManifest.slug);
          expect(doc.product_version).toBe(expectedManifest.product_version);
        });
      });
    });

    describe('contract One connector', () => {
      let contractOne: Connector;

      beforeAll(() => {
        contractOne = result.find(
          (doc) => doc.slug === 'contract-one'
        ) as Connector;
      });

      it('should exist with correct content', () => {
        expect(contractOne.name).toBe('Contract One');
        expect(contractOne.description).toBe('This is the first contract');
        expect(contractOne.short_description).toBe('First contract');
      });

      it('should have automation and integration use cases', async () => {
        const useCases = await useCaseDomain.loadUseCasesByDocumentId(
          contractOne.id
        );
        const useCaseNames = useCases.map((useCase) => useCase.name);

        expect(useCaseNames).toHaveLength(2);
        expect(useCaseNames).toContain(TEST_USE_CASES.AUTOMATION.NAME);
        expect(useCaseNames).toContain(TEST_USE_CASES.INTEGRATION.NAME);
      });
      it('should have related logo', async () => {
        const images = await DocumentChildrenDomain.loadImagesByDocumentId(
          contractOne.id
        );
        expect(images).toHaveLength(1);
        expect(images[0].file_name).toBe('contract-one-logo.png');
      });
    });

    describe('contract Two connector', () => {
      let contractTwo: Connector;

      beforeAll(() => {
        contractTwo = result.find(
          (doc) => doc.slug === 'contract-two'
        ) as Connector;
      });

      it('should exist with correct content', () => {
        expect(contractTwo).toBeDefined();
        expect(contractTwo.name).toBe('Contract Two');
        expect(contractTwo.description).toBe('This is the second contract');
        expect(contractTwo.short_description).toBe('Second contract');
      });
      it('should have automation and integration use cases', async () => {
        const useCases = await useCaseDomain.loadUseCasesByDocumentId(
          contractTwo.id
        );
        const useCaseNames = useCases.map((useCase) => useCase.name);

        expect(useCaseNames).toHaveLength(1);
        expect(useCaseNames).toContain(TEST_USE_CASES.MONITORING.NAME);
      });
    });
  });

  describe('when updating existing connectors', () => {
    let firstResult: Connector[];
    let secondResult: Connector[];
    let updatedManifest: ManifestInformation[];

    beforeAll(async () => {
      // First creation
      requestContext.set({
        user: SYSTEM_USER_CONTEXT.user,
      });
      firstResult = await IngestManifestDomain.upsertConnectors(
        sampleExtractedManifest as ManifestInformation[]
      );

      // Prepare updated manifest
      updatedManifest = sampleExtractedManifest.map((manifest) => ({
        ...manifest,
        description: `${manifest.description} - Updated`,
        short_description: `${manifest.short_description} - Updated`,
        product_version: '1.2.2-test',
        use_cases: [
          TEST_USE_CASES.DETECTION.NAME,
          TEST_USE_CASES.RESPONSE.NAME,
        ],
      })) as ManifestInformation[];

      // Second call - update
      secondResult = await IngestManifestDomain.upsertConnectors(
        updatedManifest as ManifestInformation[]
      );
    });

    it('should return same number of documents', () => {
      expect(secondResult).toHaveLength(updatedManifest.length);
    });

    it('should preserve document IDs', () => {
      secondResult.forEach((doc, index) => {
        expect(doc.id).toBe((firstResult[index] as Connector).id);
      });
    });

    it('should update description fields', () => {
      secondResult.forEach((doc, index) => {
        const expectedManifest = updatedManifest[index];
        expect(expectedManifest).toBeDefined();
        if (!expectedManifest) {
          return;
        }
        expect(doc.description).toBe(expectedManifest.description);
        expect(doc.short_description).toBe(expectedManifest.short_description);
        expect(doc.description).toContain('- Updated');
        expect(doc.short_description).toContain('- Updated');
      });
    });

    it('should preserve slug', () => {
      secondResult.forEach((doc, index) => {
        expect(doc.slug).toBe((firstResult[index] as Connector).slug);
      });
    });

    it('should preserve version from first creation', () => {
      secondResult.forEach((doc, index) => {
        expect(doc.product_version).toBe(
          (firstResult[index] as Connector).product_version
        );
      });
    });

    it('should update timestamps and updater information', () => {
      secondResult.forEach((doc, index) => {
        expect(doc.created_at).toEqual(
          (firstResult[index] as Connector).created_at
        );
        expect(doc.updated_at).not.toBeNull();
        expect(doc.updater_id).toBe(SYSTEM_USER_UUID);
      });
    });
    it('should update use cases to new values', async () => {
      // Test use cases for each document
      for (const doc of secondResult) {
        const useCases = await useCaseDomain.loadUseCasesByDocumentId(doc.id);
        const useCaseNames = useCases.map((useCase) => useCase.name);

        expect(useCaseNames).toHaveLength(2);
        expect(useCaseNames).toContain(TEST_USE_CASES.DETECTION.NAME);
        expect(useCaseNames).toContain(TEST_USE_CASES.RESPONSE.NAME);
      }
    });

    it('should have updated logo', async () => {
      for (const doc of secondResult) {
        const images = await DocumentChildrenDomain.loadImagesByDocumentId(
          doc.id
        );
        // Verify that we still have only one image after updating
        expect(images).toHaveLength(1);
        expect(images[0].file_name).toBe(`${doc.slug}-logo.png`);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty manifest array', async () => {
      const result = await IngestManifestDomain.upsertConnectors([]);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });

  describe('use case linking', () => {
    it('should not create an unknown use case referenced by the manifest', async () => {
      const baseManifest = sampleExtractedManifest[0] as ManifestInformation;
      const manifest: ManifestInformation = {
        ...baseManifest,
        slug: 'unknown-use-case-slug',
        name: 'Unknown Use Case Connector',
        use_cases: ['Nonexistent UseCase XYZ'],
      };

      const [doc] = await IngestManifestDomain.upsertConnectors([manifest]);

      const useCase = await TestHelper.useCase.load({
        name: 'Nonexistent UseCase XYZ',
      });
      expect(useCase).toBeUndefined();

      const links = await TestHelper.objectUseCase.load({
        object_id: doc!.id,
      });
      expect(links).toHaveLength(0);
    });
  });

  describe('minimum deployable version logic', () => {
    const baseManifest = sampleExtractedManifest[0] as ManifestInformation;

    it('should not set minimum_deployable_version if manager_supported is false', async () => {
      const manifest: ManifestInformation = {
        ...baseManifest,
        slug: 'min-deployable-false',
        name: 'Min Deployable False',
        product_version: '3.0.0-false',
        manager_supported: false,
        minimum_deployable_version: undefined,
      };
      await IngestManifestDomain.upsertConnectors([manifest]);
      const [result] = await IngestManifestDomain.upsertConnectors([
        { ...manifest, product_version: '3.0.1-false' },
      ]);
      expect(result).toBeDefined();
      expect(result!.minimum_deployable_version).toBeNull();
    });

    it('should set minimum_deployable_version from the stored product_version when manager_supported is true and not set', async () => {
      const manifest: ManifestInformation = {
        ...baseManifest,
        slug: 'min-deployable-true',
        name: 'Min Deployable True',
        product_version: '3.0.0-true',
        manager_supported: true,
        minimum_deployable_version: undefined,
      };
      await IngestManifestDomain.upsertConnectors([manifest]);
      const [result] = await IngestManifestDomain.upsertConnectors([
        { ...manifest, product_version: undefined },
      ]);
      expect(result).toBeDefined();
      expect(result!.minimum_deployable_version).toBe('3.0.0-true');
    });

    it('should fall back to the incoming manifest product_version when the stored one is null', async () => {
      const manifest: ManifestInformation = {
        ...baseManifest,
        slug: 'min-deployable-fallback',
        name: 'Min Deployable Fallback',
        product_version: undefined,
        manager_supported: true,
        minimum_deployable_version: undefined,
      };

      await IngestManifestDomain.upsertConnectors([manifest]);

      const [result] = await IngestManifestDomain.upsertConnectors([
        { ...manifest, product_version: '4.0.0-fallback' },
      ]);
      expect(result).toBeDefined();
      expect(result!.minimum_deployable_version).toBe('4.0.0-fallback');
    });

    it('should not override minimum_deployable_version if already set, regardless of manager_supported', async () => {
      const manifest: ManifestInformation = {
        ...baseManifest,
        slug: 'min-deployable-already',
        name: 'Min Deployable Already',
        product_version: '3.0.0-already',
        manager_supported: true,
        minimum_deployable_version: '2.2.2',
      };
      await IngestManifestDomain.upsertConnectors([manifest]);
      const [result] = await IngestManifestDomain.upsertConnectors([
        {
          ...manifest,
          product_version: '3.0.1-already',
          manager_supported: false,
        },
      ]);
      expect(result).toBeDefined();
      expect(result!.minimum_deployable_version).toBe('2.2.2');
    });
  });

  describe('datasheet_url, demo_url and blogpost_url preservation', () => {
    const baseManifest = sampleExtractedManifest[0] as ManifestInformation;
    const initialDatasheetUrl = 'https://filigran.io/datasheet.pdf';
    const initialDemoUrl = 'https://filigran.io/demo';
    const initialBlogpostUrl = 'https://filigran.io/blogpost';

    it('should preserve datasheet_url and demo_url from the first creation', async () => {
      // First creation with datasheet_url and demo_url set
      const manifest: ManifestInformation = {
        ...baseManifest,
        slug: 'datasheet-demo-test',
        name: 'Datasheet Demo Test',
        datasheet_url: initialDatasheetUrl,
        demo_url: initialDemoUrl,
        blogpost_url: initialBlogpostUrl,
      };
      await IngestManifestDomain.upsertConnectors([manifest]);

      // Second call with datasheet_url and demo_url changed in manifest
      const updatedManifest: ManifestInformation = {
        ...manifest,
        description: 'Updated description',
        datasheet_url: 'https://malicious-override.com/datasheet.pdf',
        demo_url: 'https://malicious-override.com/demo',
        blogpost_url: 'https://malicious-override.com/blogpost',
      };
      const [secondResult] = await IngestManifestDomain.upsertConnectors([
        updatedManifest,
      ]);

      expect(secondResult).toBeDefined();
      expect(secondResult!.datasheet_url).toBe(initialDatasheetUrl);
      expect(secondResult!.demo_url).toBe(initialDemoUrl);
      expect(secondResult!.blogpost_url).toBe(initialBlogpostUrl);
    });
  });

  describe('coverage', () => {
    const baseManifest = sampleExtractedManifest[0] as ManifestInformation;
    const FINANCE = 'Finance';

    const buildCoverageManifest = (
      slug: string,
      overrides: Partial<ManifestInformation> = {}
    ): ManifestInformation => ({
      ...baseManifest,
      slug,
      name: 'Coverage connector',
      description: 'Generic description',
      short_description: 'Generic',
      use_cases: [],
      solution_categories: [],
      ...overrides,
    });

    const loadCoverage = async (document: Connector | undefined) =>
      IntegrationCoverageDomain.loadStoredCoverage(document!.id);

    it('should store the coverage declared by the manifest', async () => {
      // Given
      const manifest = buildCoverageManifest('coverage-declared', {
        coverage: { object_types: ['malware'], regions: ['Europe'] },
      });

      // When
      const [document] = await IngestManifestDomain.upsertConnectors([
        manifest,
      ]);

      // Then
      expect(await loadCoverage(document)).toEqual({
        object_types: ['Malware'],
        sectors: [],
        regions: ['Europe'],
        inferred: false,
      });
    });

    it('should infer the coverage when the manifest declares none', async () => {
      // Given
      const manifest = buildCoverageManifest('coverage-inferred', {
        name: 'Ransomware tracker',
      });

      // When
      const [document] = await IngestManifestDomain.upsertConnectors([
        manifest,
      ]);

      // Then
      expect(await loadCoverage(document)).toEqual({
        object_types: ['Malware', 'Intrusion-Set'],
        sectors: [],
        regions: [],
        inferred: true,
      });
    });

    it('should keep an admin declared coverage when the manifest declares none', async () => {
      // Given
      const manifest = buildCoverageManifest('coverage-admin-kept');
      const [created] = await IngestManifestDomain.upsertConnectors([manifest]);
      await IntegrationCoverageDomain.upsertCoverageMetadata([
        {
          documentId: created!.id,
          coverage: {
            object_types: [],
            sectors: [FINANCE],
            regions: [],
            inferred: false,
          },
        },
      ]);

      // When
      const [updated] = await IngestManifestDomain.upsertConnectors([
        { ...manifest, name: 'Ransomware tracker' },
      ]);

      // Then
      expect(await loadCoverage(updated)).toEqual({
        object_types: [],
        sectors: [FINANCE],
        regions: [],
        inferred: false,
      });
    });

    it('should keep an admin coverage declared after the ingestion read the connectors', async () => {
      // Given - an admin declares a coverage right after the batch read of the existing connectors
      const manifest = buildCoverageManifest('coverage-admin-during-ingestion');
      const [created] = await IngestManifestDomain.upsertConnectors([manifest]);
      const declaredCoverage = {
        object_types: [],
        sectors: [FINANCE],
        regions: [],
        inferred: false,
      };
      const loadDocumentsByMetadata = DocumentDomain.loadDocumentsByMetadata;
      const spy = vi
        .spyOn(DocumentDomain, 'loadDocumentsByMetadata')
        .mockImplementationOnce(async (...args) => {
          const snapshot = await loadDocumentsByMetadata(...args);
          await IntegrationCoverageDomain.upsertCoverageMetadata([
            { documentId: created!.id, coverage: declaredCoverage },
          ]);
          return snapshot;
        });

      // When
      const [updated] = await IngestManifestDomain.upsertConnectors([
        { ...manifest, name: 'Ransomware tracker' },
      ]);
      spy.mockRestore();

      // Then
      expect(await loadCoverage(updated)).toEqual(declaredCoverage);
    });

    it('should let a coverage declared by the manifest replace the stored one', async () => {
      // Given
      const manifest = buildCoverageManifest('coverage-manifest-wins', {
        coverage: { sectors: [FINANCE] },
      });
      await IngestManifestDomain.upsertConnectors([manifest]);

      // When
      const [updated] = await IngestManifestDomain.upsertConnectors([
        { ...manifest, coverage: { regions: ['Global'] } },
      ]);

      // Then
      expect(await loadCoverage(updated)).toEqual({
        object_types: [],
        sectors: [],
        regions: ['Global'],
        inferred: false,
      });
    });
  });
});
