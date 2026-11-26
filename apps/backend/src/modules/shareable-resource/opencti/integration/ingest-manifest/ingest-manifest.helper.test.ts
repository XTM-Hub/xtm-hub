import { beforeEach, describe, expect, it, MockInstance, vi } from 'vitest';
import {
  DocumentMetadataKeyCode,
  DocumentSourceType,
  IntegrationType,
  LicenseType,
} from '../../../../../__generated__/resolvers-types';
import { logApp } from '../../../../../utils/app-logger.util';
import { MAX_CONTACT_LENGTH } from '../../../manifest-fragment/manifest-fragment.helper';
import { OPENCTI_INTEGRATION_DOCUMENT_TYPE } from '../integration.model';
import {
  IngestManifestHelper,
  ManifestExtractionResult,
} from './ingest-manifest.helper';
import sampleManifest from './test/sample-manifest.json';

describe('ingest manifest helper', () => {
  describe('extractManifestInfo', () => {
    let warnSpy: MockInstance;

    beforeEach(() => {
      warnSpy = vi.spyOn(logApp, 'warn').mockImplementation(() => {});
    });

    const baseContract = {
      title: 'Base Contract',
      slug: 'base-contract',
      description: 'A contract used for field-level cases',
      short_description: 'Base contract',
      logo: 'https://example.com/logo.png',
      use_cases: ['test'],
      verified: true,
      container_image: 'docker.io/example/base:latest',
      source_code: 'https://github.com/example/base',
      subscription_link: '',
      manager_supported: true,
      playbook_supported: false,
    };

    const buildManifest = (overrides: Record<string, unknown>) => ({
      id: 'contract-manifest',
      name: 'Contract Manifest',
      description: 'Field-level cases',
      version: '1.0.0',
      contracts: [{ ...baseContract, ...overrides }],
    });
    describe('with valid manifest data', () => {
      it('should extract manifest information from valid JSON', () => {
        const result =
          IngestManifestHelper.extractManifestInformation(sampleManifest);
        expect(result.validContracts).toHaveLength(2);
        expect(result.errors).toHaveLength(0);
        expect(result.validContracts[0]).toEqual({
          product_version: '1.0.0',
          name: 'Contract One',
          slug: 'contract-one',
          description: 'This is the first contract',
          short_description: 'First contract',
          logo: 'data:image/png;base64,abc123',
          use_cases: ['automation', 'integration'],
          verified: true,
          container_image: 'docker.io/example/image:latest',
          source_code: 'https://github.com/example/repo',
          subscription_link: 'https://example.com/subscribe',
          type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
          integration_type: IntegrationType.Connector,
          manager_supported: true,
          playbook_supported: false,
          source_type: DocumentSourceType.External,
          service_instance_id: '0f4aad4b-bdd6-4084-8b1f-82c9c66578cc',
          license_type: LicenseType.Commercial,
          contact: 'contributor@example.com',
          solution_categories: [
            'Threat Intelligence Feed',
            'Endpoint Detection & Response',
          ],
        });
        expect(result.validContracts[1]).toEqual({
          product_version: '1.0.0',
          name: 'Contract Two',
          slug: 'contract-two',
          description: 'This is the second contract',
          short_description: 'Second contract',
          logo: 'https://example.com/logo.png',
          use_cases: ['monitoring'],
          verified: false,
          container_image: 'docker.io/example/image2:latest',
          source_code: 'https://github.com/example/repo2',
          subscription_link: 'https://example.com/subscribe2',
          type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
          integration_type: IntegrationType.Connector,
          manager_supported: false,
          playbook_supported: true,
          source_type: DocumentSourceType.External,
          service_instance_id: '0f4aad4b-bdd6-4084-8b1f-82c9c66578cc',
        });
      });

      it('should return correct ManifestInformation type with expected properties', () => {
        const result: ManifestExtractionResult =
          IngestManifestHelper.extractManifestInformation(sampleManifest);
        expect(result.validContracts).toBeDefined();
        expect(result.validContracts.length).toBeGreaterThan(0);
        const firstItem = result.validContracts[0];
        expect(firstItem).toBeTruthy();
        if (!firstItem) {
          return;
        }
        expect(firstItem).toHaveProperty(
          DocumentMetadataKeyCode.ProductVersion
        );
        expect(typeof firstItem.product_version).toBe('string');
        expect(firstItem).toHaveProperty('name');
        expect(typeof firstItem.name).toBe('string');
        expect(firstItem).toHaveProperty('description');
        expect(typeof firstItem.description).toBe('string');
        expect(firstItem).toHaveProperty('short_description');
        expect(typeof firstItem.short_description).toBe('string');
        expect(firstItem).toHaveProperty(
          DocumentMetadataKeyCode.ContainerImage
        );
        expect(typeof firstItem.container_image).toBe('string');
        expect(firstItem).toHaveProperty('slug');
        expect(typeof firstItem.slug).toBe('string');
        expect(firstItem).toHaveProperty('logo');
        expect(typeof firstItem.logo).toBe('string');
        expect(firstItem).toHaveProperty(DocumentMetadataKeyCode.Verified);
        expect(typeof firstItem.verified).toBe('boolean');
        expect(firstItem).toHaveProperty(
          DocumentMetadataKeyCode.IntegrationType
        );
        expect(typeof firstItem.integration_type).toBe('string');
        expect(firstItem).toHaveProperty('type');
        expect(typeof firstItem.type).toBe('string');
        expect(firstItem).toHaveProperty('use_cases');
        expect(Array.isArray(firstItem.use_cases)).toBe(true);
        expect(firstItem).toHaveProperty(
          DocumentMetadataKeyCode.ManagerSupported
        );
        expect(typeof firstItem.manager_supported).toBe('boolean');
        expect(firstItem).toHaveProperty(
          DocumentMetadataKeyCode.PlaybookSupported
        );
        expect(typeof firstItem.playbook_supported).toBe('boolean');
        expect(typeof firstItem.source_code).toBe('string');

        if (firstItem.subscription_link !== undefined) {
          expect(typeof firstItem.subscription_link).toBe('string');
        }
      });
    });

    describe('with license_type values', () => {
      it.each`
        input           | expected                  | warns    | description
        ${'Commercial'} | ${LicenseType.Commercial} | ${false} | ${'canonical value'}
        ${'Free'}       | ${LicenseType.Free}       | ${false} | ${'other canonical value'}
        ${null}         | ${undefined}              | ${false} | ${'explicit null from manifest'}
        ${undefined}    | ${undefined}              | ${false} | ${'field absent'}
        ${'OpenSource'} | ${undefined}              | ${true}  | ${'unknown value falls back'}
      `(
        'should map $description to $expected',
        ({ input, expected, warns }) => {
          const result = IngestManifestHelper.extractManifestInformation(
            buildManifest({ license_type: input })
          );

          expect(result.validContracts).toHaveLength(1);
          expect(result.errors).toHaveLength(0);
          expect(result.validContracts[0]?.license_type).toBe(expected);

          if (warns) {
            expect(warnSpy).toHaveBeenCalledWith(
              'Invalid license_type in manifest contract, field ignored',
              { input }
            );
          } else {
            expect(warnSpy).not.toHaveBeenCalled();
          }
        }
      );
    });

    describe('with contact values', () => {
      it.each`
        input                                 | expected                     | warns    | description
        ${'contributor@example.com'}          | ${'contributor@example.com'} | ${false} | ${'a plain contact'}
        ${'  contributor@example.com  '}      | ${'contributor@example.com'} | ${false} | ${'surrounding whitespace'}
        ${''}                                 | ${undefined}                 | ${false} | ${'empty string'}
        ${null}                               | ${undefined}                 | ${false} | ${'explicit null from manifest'}
        ${'a'.repeat(MAX_CONTACT_LENGTH + 1)} | ${undefined}                 | ${true}  | ${'above the length limit'}
      `(
        'should map $description to $expected',
        ({ input, expected, warns }) => {
          const result = IngestManifestHelper.extractManifestInformation(
            buildManifest({ contact: input })
          );

          expect(result.validContracts).toHaveLength(1);
          expect(result.errors).toHaveLength(0);
          expect(result.validContracts[0]?.contact).toBe(expected);

          if (warns) {
            // no second argument asserted: the contact value (PII) must not be logged
            expect(warnSpy).toHaveBeenCalledWith(
              'Invalid contact in manifest contract, field ignored'
            );
          } else {
            expect(warnSpy).not.toHaveBeenCalled();
          }
        }
      );
    });

    describe('with solution_categories values', () => {
      it.each`
        input                   | expected                | warns    | description
        ${['Network Security']} | ${['Network Security']} | ${false} | ${'a valid list'}
        ${[]}                   | ${[]}                   | ${false} | ${'an empty list'}
        ${null}                 | ${undefined}            | ${false} | ${'explicit null from manifest'}
        ${'not-an-array'}       | ${undefined}            | ${true}  | ${'a non-array value'}
        ${[123]}                | ${undefined}            | ${true}  | ${'a list with a non-string element'}
      `(
        'should map $description to $expected',
        ({ input, expected, warns }) => {
          const result = IngestManifestHelper.extractManifestInformation(
            buildManifest({ solution_categories: input })
          );

          expect(result.validContracts).toHaveLength(1);
          expect(result.errors).toHaveLength(0);
          expect(result.validContracts[0]?.solution_categories).toEqual(
            expected
          );

          if (warns) {
            expect(warnSpy).toHaveBeenCalledWith(
              'Invalid solution_categories in manifest contract, field ignored',
              { input }
            );
          } else {
            expect(warnSpy).not.toHaveBeenCalled();
          }
        }
      );
    });

    describe('with invalid manifest data', () => {
      it('should return empty validContracts and error for invalid data structure', () => {
        const invalidData = {
          data: {
            id: 'test',
          },
        };
        const result =
          IngestManifestHelper.extractManifestInformation(invalidData);
        expect(result.validContracts).toEqual([]);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]?.error).toContain('Manifest structure invalid');
      });

      it('should return empty validContracts for missing required manifest fields', () => {
        const invalidManifest = {
          contracts: [
            {
              title: 'Test Contract',
            },
          ],
        };
        const result =
          IngestManifestHelper.extractManifestInformation(invalidManifest);
        expect(result.validContracts).toEqual([]);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should return empty validContracts for null input', () => {
        const result = IngestManifestHelper.extractManifestInformation(null);
        expect(result.validContracts).toEqual([]);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should return empty validContracts for undefined input', () => {
        const result =
          IngestManifestHelper.extractManifestInformation(undefined);
        expect(result.validContracts).toEqual([]);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should return empty validContracts for non-object input', () => {
        const result =
          IngestManifestHelper.extractManifestInformation('not an object');
        expect(result.validContracts).toEqual([]);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('with empty contracts array', () => {
      it('should return empty validContracts when contracts is empty', () => {
        const emptyContractsManifest = {
          id: 'test-manifest',
          name: 'Test Manifest',
          description: 'Test description',
          version: '1.0.0',
          contracts: [],
        };
        const result = IngestManifestHelper.extractManifestInformation(
          emptyContractsManifest
        );
        expect(result.validContracts).toEqual([]);
        expect(result.errors).toEqual([]);
      });
    });

    describe('with mixed valid and invalid contracts (fail-safe behavior)', () => {
      it('should process valid contracts and report errors for invalid ones', () => {
        const mixedManifest = {
          id: 'mixed-manifest',
          name: 'Mixed Manifest',
          description: 'Manifest with both valid and invalid contracts',
          version: '2.0.0',
          contracts: [
            // Valid contract
            {
              title: 'Valid Contract',
              slug: 'valid-contract',
              description: 'This is a valid contract',
              short_description: 'Valid contract',
              logo: 'https://example.com/logo.png',
              use_cases: ['security', 'monitoring'],
              verified: true,
              container_image: 'docker.io/example/valid:latest',
              source_code: 'https://github.com/example/valid',
              subscription_link: 'https://example.com/subscribe',
              manager_supported: true,
              playbook_supported: false,
            },
            // Invalid contract - missing required fields
            {
              title: 'Invalid Contract Missing Fields',
              slug: 'invalid-missing',
              description: 'Missing required fields',
              // Missing: short_description, logo, use_cases, etc.
            },
            // Invalid contract - wrong types
            {
              title: 'Invalid Contract Wrong Types',
              slug: 'invalid-types',
              description: 'Has wrong field types',
              short_description: 'Wrong types',
              logo: 'https://example.com/logo2.png',
              use_cases: 'should-be-array', // Wrong type
              verified: 'yes', // Wrong type
              container_image: 'docker.io/example/invalid:latest',
              source_code: 'not-a-url', // Invalid URL
              subscription_link: '',
              manager_supported: true,
              playbook_supported: false,
            },
            // Another valid contract
            {
              title: 'Another Valid Contract',
              slug: 'another-valid',
              description: 'This is another valid contract',
              short_description: 'Another valid',
              logo: 'https://example.com/logo3.png',
              use_cases: ['automation'],
              verified: false,
              container_image: 'docker.io/example/valid2:latest',
              source_code: 'https://github.com/example/valid2',
              subscription_link: '',
              manager_supported: false,
              playbook_supported: true,
            },
          ],
        };

        const result =
          IngestManifestHelper.extractManifestInformation(mixedManifest);

        // Should have processed 2 valid contracts
        expect(result.validContracts).toHaveLength(2);
        expect(result.validContracts[0]?.name).toBe('Valid Contract');
        expect(result.validContracts[0]?.slug).toBe('valid-contract');
        expect(result.validContracts[1]?.name).toBe('Another Valid Contract');
        expect(result.validContracts[1]?.slug).toBe('another-valid');

        // Should have 2 errors for invalid contracts
        expect(result.errors).toHaveLength(2);

        // Check first error
        expect(result.errors[0]?.contractTitle).toBe(
          'Invalid Contract Missing Fields'
        );
        expect(result.errors[0]?.contractSlug).toBe('invalid-missing');
        expect(result.errors[0]?.error).toContain(
          'expected string, received undefined'
        );

        // Check second error
        expect(result.errors[1]?.contractTitle).toBe(
          'Invalid Contract Wrong Types'
        );
        expect(result.errors[1]?.contractSlug).toBe('invalid-types');
        expect(result.errors[1]?.error).toBeDefined();
      });

      it('should handle contracts with partial identifiers in errors', () => {
        const partialManifest = {
          id: 'partial-manifest',
          name: 'Partial Manifest',
          description: 'Manifest with partial contract data',
          version: '1.0.0',
          contracts: [
            // Contract with only title
            {
              title: 'Only Title Contract',
              // Missing everything else
            },
            // Contract with only slug
            {
              slug: 'only-slug-contract',
              // Missing everything else
            },
            // Contract with neither title nor slug
            {
              description: 'No identifiers',
              // Missing title and slug
            },
          ],
        };

        const result =
          IngestManifestHelper.extractManifestInformation(partialManifest);

        // All contracts should be invalid
        expect(result.validContracts).toHaveLength(0);
        expect(result.errors).toHaveLength(3);

        // Check error identifiers
        expect(result.errors[0]?.contractTitle).toBe('Only Title Contract');
        expect(result.errors[0]?.contractSlug).toBe('Unknown');

        expect(result.errors[1]?.contractTitle).toBe('Unknown');
        expect(result.errors[1]?.contractSlug).toBe('only-slug-contract');

        expect(result.errors[2]?.contractTitle).toBe('Unknown');
        expect(result.errors[2]?.contractSlug).toBe('Unknown');
      });

      it('should continue processing after encountering an invalid contract', () => {
        const sequentialManifest = {
          id: 'sequential-manifest',
          name: 'Sequential Manifest',
          description: 'Test processing continues after errors',
          version: '1.0.0',
          contracts: [
            // Valid
            {
              title: 'First Valid',
              slug: 'first-valid',
              description: 'First valid contract',
              short_description: 'First',
              logo: 'https://example.com/1.png',
              use_cases: ['test'],
              verified: true,
              container_image: 'docker.io/first:latest',
              source_code: 'https://github.com/example/first',
              subscription_link: '',
              manager_supported: true,
              playbook_supported: false,
            },
            // Invalid
            {
              title: 'Invalid Middle',
              // Missing required fields
            },
            // Valid
            {
              title: 'Last Valid',
              slug: 'last-valid',
              description: 'Last valid contract',
              short_description: 'Last',
              logo: 'https://example.com/3.png',
              use_cases: ['test'],
              verified: false,
              container_image: 'docker.io/last:latest',
              source_code: 'https://github.com/example/last',
              subscription_link: '',
              manager_supported: false,
              playbook_supported: true,
            },
          ],
        };

        const result =
          IngestManifestHelper.extractManifestInformation(sequentialManifest);

        // Should process both valid contracts despite invalid one in middle
        expect(result.validContracts).toHaveLength(2);
        expect(result.validContracts[0]?.name).toBe('First Valid');
        expect(result.validContracts[1]?.name).toBe('Last Valid');

        // Should have 1 error for the invalid contract
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]?.contractTitle).toBe('Invalid Middle');
      });
    });
  });
});
