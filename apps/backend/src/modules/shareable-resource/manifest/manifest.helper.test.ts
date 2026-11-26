import { Readable } from 'stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TEST_ORGANIZATIONS } from '../../../../tests/tests.const';
import {
  DocumentImageType,
  LicenseType,
  ManifestType,
  PlatformIdentifier,
} from '../../../__generated__/resolvers-types';
import { DocumentId } from '../../../model/kanel/public/Document';
import { MinIOClient } from '../../../thirdparty/minio/client';
import {
  buildManifestRebuildSingletonKey,
  MANIFEST_QUEUES,
} from '../../../thirdparty/pgboss/manifest.jobs';
import { PgBossProducer } from '../../../thirdparty/pgboss/producer';
import { logApp } from '../../../utils/app-logger.util';
import { WithParentId } from '../../document/document.helper';
import { DocumentImage } from '../../document/document.model';
import { DocumentChildrenDomain } from '../../document/domain/document.children.domain';
import { ConnectorV2 } from '../opencti/integration/integration.model';
import type { ManifestKey } from './manifest.consts';
import {
  MANIFEST_CATALOG_DESCRIPTION,
  MANIFEST_CATALOG_ID,
  MANIFEST_CATALOG_NAME,
  MANIFEST_SCHEMA_VERSION,
  ManifestHelper,
} from './manifest.helper';
import { ManifestContract } from './manifest.types';

const FIXED_DATE = new Date('2026-07-01T12:00:00Z');

const MANIFEST_KEY: ManifestKey = {
  platformIdentifier: PlatformIdentifier.Opencti,
  version: '7.260309.0',
  type: ManifestType.Connector,
};

const LTS_KEY: ManifestKey = {
  platformIdentifier: PlatformIdentifier.Opencti,
  version: '7.260309.0-lts.5',
  type: ManifestType.Connector,
};

const buildConnector = (overrides: Partial<ConnectorV2> = {}): ConnectorV2 =>
  ({
    id: 'connector-uuid-1',
    manifest_fragment_id: 'manifest-fragment-id-1',
    name: 'MISP',
    slug: 'misp',
    description: 'Long description',
    short_description: 'Short desc',
    verified: true,
    subscription_link: 'https://misp-project.org',
    source_code: 'https://github.com/OpenCTI-Platform/connectors',
    manager_supported: true,
    minimum_deployable_version: '7.260507.0',
    minimum_deployable_version_padded: '007.260507.000',
    version: '6.5.1',
    playbook_supported: false,
    integration_type: 'connector',
    image_name: 'opencti/connector-misp',
    image_type: 'EXTERNAL_IMPORT',
    last_verified_date: '2025-01-15',
    additional_properties: '{"key":"value"}',
    config_schema: '{"type":"object"}',
    license_type: LicenseType.Commercial,
    contact: 'https://github.com/some-contributor',
    ...overrides,
  }) as unknown as ConnectorV2;

describe('manifestHelper', () => {
  describe('enqueueImmediateRebuild', () => {
    it('sends a job on the immediate queue keyed on the manifest, for pg-boss retry handling', async () => {
      const sendSpy = vi
        .spyOn(PgBossProducer, 'send')
        .mockResolvedValue('job-1');

      await ManifestHelper.enqueueImmediateRebuild(MANIFEST_KEY);

      expect(sendSpy).toHaveBeenCalledOnce();
      const [queueName, data, options] = sendSpy.mock.calls[0]!;
      expect(queueName).toBe(MANIFEST_QUEUES.IMMEDIATE);
      expect(data).toEqual(MANIFEST_KEY);
      expect(options?.singletonKey).toBe(
        buildManifestRebuildSingletonKey(MANIFEST_KEY)
      );
    });

    it('uses a distinct singletonKey per manifest key so unrelated manifests never collide', async () => {
      const sendSpy = vi
        .spyOn(PgBossProducer, 'send')
        .mockResolvedValue('job-1');

      await ManifestHelper.enqueueImmediateRebuild(MANIFEST_KEY);
      await ManifestHelper.enqueueImmediateRebuild(LTS_KEY);

      expect(sendSpy).toHaveBeenCalledTimes(2);
      const firstKey = sendSpy.mock.calls[0]![2]?.singletonKey;
      const secondKey = sendSpy.mock.calls[1]![2]?.singletonKey;
      expect(firstKey).not.toBe(secondKey);
    });
  });

  describe('scheduleDebouncedRebuild', () => {
    it('delegates to PgBossProducer.debounce with the manifest key, singletonKey, and configured debounce window', async () => {
      const debounceSpy = vi
        .spyOn(PgBossProducer, 'debounce')
        .mockResolvedValue({ jobs: ['job-1'], updated: 1, inserted: 0 });

      await ManifestHelper.scheduleDebouncedRebuild(MANIFEST_KEY);

      expect(debounceSpy).toHaveBeenCalledExactlyOnceWith(
        MANIFEST_QUEUES.REBUILD,
        MANIFEST_KEY,
        {
          singletonKey: buildManifestRebuildSingletonKey(MANIFEST_KEY),
          debounceSeconds: 10 * 60,
        }
      );
    });

    it('uses a distinct singletonKey per manifest key so unrelated manifests never collide', async () => {
      const debounceSpy = vi
        .spyOn(PgBossProducer, 'debounce')
        .mockResolvedValue({ jobs: ['job-1'], updated: 0, inserted: 1 });

      await ManifestHelper.scheduleDebouncedRebuild(MANIFEST_KEY);
      await ManifestHelper.scheduleDebouncedRebuild(LTS_KEY);

      expect(debounceSpy).toHaveBeenCalledTimes(2);
      const firstKey = debounceSpy.mock.calls[0]![2].singletonKey;
      const secondKey = debounceSpy.mock.calls[1]![2].singletonKey;
      expect(firstKey).not.toBe(secondKey);
    });
  });

  describe('partitionConnectorsByVersionCompatibility', () => {
    it.each([
      {
        description: 'no minimum version - compatible',
        minimumDeployableVersion: undefined,
        version: '7.260309.0',
        expectedPartition: 'compatible' as const,
      },
      {
        description: 'minimum version equal to manifest - compatible',
        minimumDeployableVersion: '007.260309.000',
        version: '7.260309.0',
        expectedPartition: 'compatible' as const,
      },
      {
        description: 'minimum version below manifest - compatible',
        minimumDeployableVersion: '007.260101.000',
        version: '7.260309.0',
        expectedPartition: 'compatible' as const,
      },
      {
        description: 'minimum version above manifest - incompatible',
        minimumDeployableVersion: '007.260601.000',
        version: '7.260309.0',
        expectedPartition: 'incompatible' as const,
      },
      {
        description: 'lts minimum version equal to lts manifest - compatible',
        minimumDeployableVersion: '007.260309.000.LTS.005',
        version: '7.260309.0-lts.5',
        expectedPartition: 'compatible' as const,
      },
      {
        description: 'lts minimum version above lts manifest - incompatible',
        minimumDeployableVersion: '007.260601.000.LTS.001',
        version: '7.260309.0-lts.5',
        expectedPartition: 'incompatible' as const,
      },
    ])(
      '$description',
      ({
        minimumDeployableVersion,
        version,
        expectedPartition,
      }: {
        minimumDeployableVersion: string | undefined;
        version: string;
        expectedPartition: 'compatible' | 'incompatible';
      }) => {
        const connector = buildConnector({
          minimum_deployable_version_padded: minimumDeployableVersion,
        });
        const { compatible, incompatible } =
          ManifestHelper.partitionConnectorsByVersionCompatibility(
            [connector],
            version
          );
        if (expectedPartition === 'compatible') {
          expect(compatible).toHaveLength(1);
          expect(incompatible).toHaveLength(0);
        } else {
          expect(incompatible).toHaveLength(1);
          expect(compatible).toHaveLength(0);
        }
      }
    );

    it('correctly partitions a mixed list', () => {
      const connectors = [
        buildConnector({
          slug: 'a',
          minimum_deployable_version_padded: '007.260101.000',
        }),
        buildConnector({
          slug: 'b',
          minimum_deployable_version_padded: '007.260601.000',
        }),
        buildConnector({
          slug: 'c',
          minimum_deployable_version_padded: undefined,
        }),
        buildConnector({
          slug: 'd',
          minimum_deployable_version_padded: '007.260309.000',
        }),
      ];
      const { compatible, incompatible } =
        ManifestHelper.partitionConnectorsByVersionCompatibility(
          connectors,
          '7.260309.0'
        );
      expect(compatible.map((c) => c.slug)).toEqual(['a', 'c', 'd']);
      expect(incompatible.map((c) => c.slug)).toEqual(['b']);
    });

    it('returns two empty arrays when given an empty list', () => {
      const { compatible, incompatible } =
        ManifestHelper.partitionConnectorsByVersionCompatibility([], '6.5.0');
      expect(compatible).toHaveLength(0);
      expect(incompatible).toHaveLength(0);
    });
  });
  describe('uploadManifest', () => {
    const fileName =
      'opencti/7.260604.0/connector/manifest/connector-manifest-7.260604.0-260701120000.json';
    const manifest = ManifestHelper.buildConnectorManifestOutput(
      '7.260604.0',
      [],
      FIXED_DATE,
      new Map()
    );

    beforeEach(() => {
      vi.spyOn(MinIOClient, 'uploadFile').mockResolvedValue(fileName);
    });

    it('calls uploadFile once with the correct key', async () => {
      await ManifestHelper.uploadManifest(manifest, fileName);
      expect(MinIOClient.uploadFile).toHaveBeenCalledOnce();
      expect(MinIOClient.uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: fileName,
          mimetype: 'application/json',
        }),
        fileName,
        TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
        fileName
      );
    });

    it('uploads valid JSON matching the manifest', async () => {
      await ManifestHelper.uploadManifest(manifest, fileName);
      const call = vi.mocked(MinIOClient.uploadFile).mock.calls[0]![0];
      const body = call.createReadStream();
      const chunks: Buffer[] = [];
      for await (const chunk of body) {
        chunks.push(
          Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string)
        );
      }
      const parsed = JSON.parse(Buffer.concat(chunks).toString());
      expect(parsed).toEqual(manifest);
    });
  });

  describe('buildManifestFileName', () => {
    it.each`
      product      | version         | expected
      ${'opencti'} | ${'7.260604.0'} | ${'opencti/7.260604.0/connector/manifest/connector-manifest-7.260604.0-260701120000.json'}
      ${'opencti'} | ${'6.5.1'}      | ${'opencti/6.5.1/connector/manifest/connector-manifest-6.5.1-260701120000.json'}
      ${'openaev'} | ${'7.260604.0'} | ${'openaev/7.260604.0/connector/manifest/connector-manifest-7.260604.0-260701120000.json'}
    `(
      'builds "$expected" for product "$product" and version "$version"',
      ({
        product,
        version,
        expected,
      }: {
        product: string;
        version: string;
        expected: string;
      }) => {
        expect(
          ManifestHelper.buildManifestFileNameWithPath(
            product,
            version,
            FIXED_DATE
          )
        ).toBe(expected);
      }
    );
  });

  describe('buildManifestOutput', () => {
    describe('header fields', () => {
      it('sets static catalog fields correctly', () => {
        const output = ManifestHelper.buildConnectorManifestOutput(
          '7.260604.0',
          [],
          FIXED_DATE,
          new Map()
        );

        expect(output.id).toBe(MANIFEST_CATALOG_ID);
        expect(output.name).toBe(MANIFEST_CATALOG_NAME);
        expect(output.description).toBe(MANIFEST_CATALOG_DESCRIPTION);
        expect(output.manifest_schema_version).toBe(MANIFEST_SCHEMA_VERSION);
      });

      it('sets product_version from the version argument', () => {
        const output = ManifestHelper.buildConnectorManifestOutput(
          '7.260604.0',
          [],
          FIXED_DATE,
          new Map()
        );
        expect(output.product_version).toBe('7.260604.0');
      });

      it('sets manifest_version with the expected format', () => {
        const output = ManifestHelper.buildConnectorManifestOutput(
          '7.260604.0',
          [],
          FIXED_DATE,
          new Map()
        );
        expect(output.manifest_version).toBe(
          'connector-manifest-7.260604.0-260701120000'
        );
      });

      it('returns an empty contracts array when no connectors are provided', () => {
        const output = ManifestHelper.buildConnectorManifestOutput(
          '7.260604.0',
          [],
          FIXED_DATE,
          new Map()
        );
        expect(output.contracts).toEqual([]);
      });
    });

    describe('contract mapping', () => {
      it('maps all fields from a connector correctly', () => {
        const connector = buildConnector();
        const output = ManifestHelper.buildConnectorManifestOutput(
          '7.260604.0',
          [connector],
          FIXED_DATE,
          new Map()
        );

        expect(output.contracts).toHaveLength(1);
        const contract = output.contracts[0]!;
        expect(contract.id).toBe('manifest-fragment-id-1');
        expect(contract.title).toBe('MISP');
        expect(contract.slug).toBe('misp');
        expect(contract.description).toBe('Long description');
        expect(contract.short_description).toBe('Short desc');
        expect(contract.verified).toBe(true);
        expect(contract.subscription_link).toBe('https://misp-project.org');
        expect(contract.source_code).toBe(
          'https://github.com/OpenCTI-Platform/connectors'
        );
        expect(contract.manager_supported).toBe(true);
        expect(contract.min_version).toBe('7.260507.0');
        expect(contract.license_type).toBe(LicenseType.Commercial);
        expect(contract.contact).toBe('https://github.com/some-contributor');
        expect(contract.solution_categories).toEqual([]);
        expect(contract.version).toBe('6.5.1');
        expect(contract.image_name).toBe('opencti/connector-misp');
        expect(contract.image_type).toBe('EXTERNAL_IMPORT');
        expect(contract.last_verified_date).toBe('2025-01-15');
        expect(contract.additional_properties).toEqual({ key: 'value' });
        expect(contract.config_schema).toEqual({ type: 'object' });
      });

      it('should expose exactly the agreed contract keys', () => {
        // Given a connector mapped to a manifest contract
        const contract = ManifestHelper.buildConnectorManifestOutput(
          '7.260604.0',
          [buildConnector()],
          FIXED_DATE,
          new Map()
        ).contracts[0]!;

        // When the contract keys are listed
        const keys = Object.keys(contract).sort();

        // Then they match the published contract, so a rename cannot slip through
        expect(keys).toEqual([
          'additional_properties',
          'config_schema',
          'contact',
          'description',
          'id',
          'image_name',
          'image_type',
          'last_verified_date',
          'license_type',
          'logo',
          'manager_supported',
          'min_version',
          'short_description',
          'slug',
          'solution_categories',
          'source_code',
          'subscription_link',
          'title',
          'use_cases',
          'verified',
          'version',
        ]);
      });

      it('sets logo to null when logoByConnectorId has no entry for the connector (also covers the default parameter)', () => {
        const contract = ManifestHelper.buildConnectorManifestOutput(
          '7.260604.0',
          [buildConnector()],
          FIXED_DATE,
          new Map()
        ).contracts[0]!;
        expect(contract.logo).toBeNull();
      });

      it('populates logo from the logoByConnectorId map', () => {
        const connector = buildConnector({
          id: 'connector-uuid-1' as DocumentId,
        });
        const logoByConnectorId = new Map<DocumentId, string | null>([
          ['connector-uuid-1' as DocumentId, 'abc123base64'],
        ]);
        const contract = ManifestHelper.buildConnectorManifestOutput(
          '7.260604.0',
          [connector],
          FIXED_DATE,
          new Map(),
          logoByConnectorId
        ).contracts[0]!;
        expect(contract.logo).toBe('abc123base64');
      });

      it('sets use_cases to empty array when no map entry exists for the connector', () => {
        const contract = ManifestHelper.buildConnectorManifestOutput(
          '7.260604.0',
          [buildConnector()],
          FIXED_DATE,
          new Map()
        ).contracts[0]!;
        expect(contract.use_cases).toEqual([]);
      });

      it('populates use_cases from the useCasesByConnectorId map', () => {
        const connector = buildConnector({
          id: 'connector-uuid-1' as DocumentId,
        });
        const useCasesByConnectorId = new Map<string, string[]>([
          ['connector-uuid-1', ['automation', 'integration']],
        ]);
        const contract = ManifestHelper.buildConnectorManifestOutput(
          '7.260604.0',
          [connector],
          FIXED_DATE,
          useCasesByConnectorId
        ).contracts[0]!;
        expect(contract.use_cases).toEqual(['automation', 'integration']);
      });

      it('populates solution_categories from the solutionCategoriesByConnectorId map', () => {
        // Given a connector linked to two categories
        const connector = buildConnector({
          id: 'connector-uuid-1' as DocumentId,
        });
        const solutionCategoriesByConnectorId = new Map<string, string[]>([
          ['connector-uuid-1', ['Threat Intelligence Feed', 'EDR/XDR']],
        ]);

        // When the contract is built
        const contract = ManifestHelper.buildConnectorManifestOutput(
          '7.260604.0',
          [connector],
          FIXED_DATE,
          new Map(),
          new Map(),
          solutionCategoriesByConnectorId
        ).contracts[0]!;

        // Then both category names are exposed
        expect(contract.solution_categories).toEqual([
          'Threat Intelligence Feed',
          'EDR/XDR',
        ]);
      });

      it('sets solution_categories to empty array when the map has no entry for the connector id', () => {
        // Given a connector with no linked category
        const contract = ManifestHelper.buildConnectorManifestOutput(
          '7.260604.0',
          [buildConnector({ id: 'connector-uuid-1' as DocumentId })],
          FIXED_DATE,
          new Map(),
          new Map(),
          new Map()
        ).contracts[0]!;

        // Then the field is an empty array, never null
        expect(contract.solution_categories).toEqual([]);
      });

      it('sets use_cases to empty array when the map has no entry for the connector id', () => {
        const connector = buildConnector({
          id: 'connector-uuid-1' as DocumentId,
        });
        const useCasesByConnectorId = new Map<string, string[]>([
          ['other-connector-id', ['automation']],
        ]);
        const contract = ManifestHelper.buildConnectorManifestOutput(
          '7.260604.0',
          [connector],
          FIXED_DATE,
          useCasesByConnectorId
        ).contracts[0]!;
        expect(contract.use_cases).toEqual([]);
      });

      it('maps last_verified_date from the connector', () => {
        const contract = ManifestHelper.buildConnectorManifestOutput(
          '7.260604.0',
          [buildConnector({ last_verified_date: '2026-06-01' })],
          FIXED_DATE,
          new Map()
        ).contracts[0]!;
        expect(contract.last_verified_date).toBe('2026-06-01');
      });

      it('allows last_verified_date to be null', () => {
        const contract = ManifestHelper.buildConnectorManifestOutput(
          '7.260604.0',
          [buildConnector({ last_verified_date: null })],
          FIXED_DATE,
          new Map()
        ).contracts[0]!;
        expect(contract.last_verified_date).toBeNull();
      });

      describe('additional_properties parsing', () => {
        beforeEach(() => {
          vi.spyOn(logApp, 'error').mockImplementation(() => undefined);
        });

        it.each`
          description            | value              | expected
          ${'valid JSON object'} | ${'{"foo":"bar"}'} | ${{ foo: 'bar' }}
          ${'empty string'}      | ${''}              | ${{}}
        `(
          'returns $expected when value is $description',
          ({
            value,
            expected,
          }: {
            value: string;
            expected: Record<string, unknown>;
          }) => {
            const contract = ManifestHelper.buildConnectorManifestOutput(
              '7.260604.0',
              [buildConnector({ additional_properties: value })],
              FIXED_DATE,
              new Map()
            ).contracts[0]!;
            expect(contract.additional_properties).toEqual(expected);
          }
        );

        it.each([
          { description: 'null', value: null },
          { description: 'undefined', value: undefined },
        ])(
          'returns {} when value is $description',
          ({ value }: { value: null | undefined }) => {
            const contract = ManifestHelper.buildConnectorManifestOutput(
              '7.260604.0',
              [
                buildConnector({
                  additional_properties: value as unknown as string,
                }),
              ],
              FIXED_DATE,
              new Map()
            ).contracts[0]!;
            expect(contract.additional_properties).toEqual({});
          }
        );

        it('falls back to {} and logs an error when value is invalid JSON', () => {
          const contract = ManifestHelper.buildConnectorManifestOutput(
            '7.260604.0',
            [buildConnector({ additional_properties: 'not-json' })],
            FIXED_DATE,
            new Map()
          ).contracts[0]!;
          expect(contract.additional_properties).toEqual({});
          expect(logApp.error).toHaveBeenCalledWith(
            expect.stringContaining('additional_properties')
          );
        });

        it('falls back to {} and logs an error when value is a JSON array', () => {
          const contract = ManifestHelper.buildConnectorManifestOutput(
            '7.260604.0',
            [buildConnector({ additional_properties: '["a","b"]' })],
            FIXED_DATE,
            new Map()
          ).contracts[0]!;
          expect(contract.additional_properties).toEqual({});
          expect(logApp.error).toHaveBeenCalledWith(
            expect.stringContaining('additional_properties')
          );
        });
      });

      describe('config_schema parsing', () => {
        beforeEach(() => {
          vi.spyOn(logApp, 'error').mockImplementation(() => undefined);
        });

        it.each`
          description            | value                  | expected
          ${'valid JSON object'} | ${'{"type":"object"}'} | ${{ type: 'object' }}
          ${'empty string'}      | ${''}                  | ${{}}
        `(
          'returns $expected when value is $description',
          ({
            value,
            expected,
          }: {
            value: string;
            expected: Record<string, unknown>;
          }) => {
            const contract = ManifestHelper.buildConnectorManifestOutput(
              '7.260604.0',
              [buildConnector({ config_schema: value })],
              FIXED_DATE,
              new Map()
            ).contracts[0]!;
            expect(contract.config_schema).toEqual(expected);
          }
        );

        it.each([
          { description: 'null', value: null },
          { description: 'undefined', value: undefined },
        ])(
          'returns {} when value is $description',
          ({ value }: { value: null | undefined }) => {
            const contract = ManifestHelper.buildConnectorManifestOutput(
              '7.260604.0',
              [buildConnector({ config_schema: value as unknown as string })],
              FIXED_DATE,
              new Map()
            ).contracts[0]!;
            expect(contract.config_schema).toEqual({});
          }
        );

        it('falls back to {} and logs an error when value is invalid JSON', () => {
          const contract = ManifestHelper.buildConnectorManifestOutput(
            '7.260604.0',
            [buildConnector({ config_schema: 'not-json' })],
            FIXED_DATE,
            new Map()
          ).contracts[0]!;
          expect(contract.config_schema).toEqual({});
          expect(logApp.error).toHaveBeenCalledWith(
            expect.stringContaining('config_schema')
          );
        });

        it('falls back to {} and logs an error when value is a JSON array', () => {
          const contract = ManifestHelper.buildConnectorManifestOutput(
            '7.260604.0',
            [buildConnector({ config_schema: '["a","b"]' })],
            FIXED_DATE,
            new Map()
          ).contracts[0]!;
          expect(contract.config_schema).toEqual({});
          expect(logApp.error).toHaveBeenCalledWith(
            expect.stringContaining('config_schema')
          );
        });
      });

      it.each([
        {
          field: 'subscription_link' as const,
          override: { subscription_link: null },
        },
        { field: 'source_code' as const, override: { source_code: null } },
        {
          field: 'min_version' as const,
          override: { minimum_deployable_version: undefined },
        },
        {
          field: 'license_type' as const,
          override: { license_type: undefined },
        },
        { field: 'contact' as const, override: { contact: undefined } },
      ])(
        'maps $field to null when the connector field is absent/null',
        ({
          field,
          override,
        }: {
          field: keyof ManifestContract;
          override: Partial<ConnectorV2>;
        }) => {
          const connector = buildConnector(override);
          const contract = ManifestHelper.buildConnectorManifestOutput(
            '7.260604.0',
            [connector],
            FIXED_DATE,
            new Map()
          ).contracts[0]!;
          expect(contract[field]).toBeNull();
        }
      );

      it('maps multiple connectors to multiple contracts', () => {
        const connectors = [
          buildConnector({
            manifest_fragment_id: 'manifest-fragment-id-1',
            slug: 'misp',
          } as Partial<ConnectorV2>),
          buildConnector({
            manifest_fragment_id: 'manifest-fragment-id-2',
            slug: 'virustotal',
          } as Partial<ConnectorV2>),
        ];
        const output = ManifestHelper.buildConnectorManifestOutput(
          '7.260604.0',
          connectors,
          FIXED_DATE,
          new Map()
        );
        expect(output.contracts).toHaveLength(2);
        expect(output.contracts[0]!.id).toBe('manifest-fragment-id-1');
        expect(output.contracts[1]!.id).toBe('manifest-fragment-id-2');
      });
    });
  });

  describe('loadConnectorLogosBase64', () => {
    const CONNECTOR_ID = 'connector-id' as DocumentId;
    const CONNECTOR_ID_2 = 'connector-id-2' as DocumentId;

    const buildImage = (
      overrides: Partial<WithParentId<DocumentImage>> = {}
    ): WithParentId<DocumentImage> =>
      ({
        id: 'image-id-1',
        minio_name: 'minio-logo-name',
        mime_type: 'image/png',
        image_type: DocumentImageType.Logo,
        _parent_id: CONNECTOR_ID,
        ...overrides,
      }) as unknown as WithParentId<DocumentImage>;

    beforeEach(() => {
      vi.spyOn(logApp, 'error').mockImplementation(() => undefined);
    });

    it('returns an empty map when given an empty list of connector ids', async () => {
      vi.spyOn(DocumentChildrenDomain, 'loadImagesByParentIds');

      const result = await ManifestHelper.loadConnectorLogosBase64([]);

      expect(result.size).toBe(0);
      expect(
        DocumentChildrenDomain.loadImagesByParentIds
      ).not.toHaveBeenCalled();
    });

    it.each([
      {
        description: 'there are no image documents at all',
        images: [],
        downloadResult: undefined,
      },
      {
        description: 'the connector has images but none is a logo',
        images: [buildImage({ image_type: DocumentImageType.Image })],
        downloadResult: undefined,
      },
      {
        description: 'the logo document has no minio_name',
        images: [buildImage({ minio_name: null })],
        downloadResult: undefined,
      },
      {
        description: 'MinIOClient.downloadFile resolves null',
        images: [buildImage()],
        downloadResult: null,
      },
    ])('returns null when $description', async ({ images, downloadResult }) => {
      vi.spyOn(
        DocumentChildrenDomain,
        'loadImagesByParentIds'
      ).mockResolvedValue(images);
      if (downloadResult !== undefined) {
        vi.spyOn(MinIOClient, 'downloadFile').mockResolvedValue(downloadResult);
      }

      const result = await ManifestHelper.loadConnectorLogosBase64([
        CONNECTOR_ID,
      ]);

      expect(result.get(CONNECTOR_ID)).toBeNull();
    });

    it('returns a data URI when the logo is found', async () => {
      vi.spyOn(
        DocumentChildrenDomain,
        'loadImagesByParentIds'
      ).mockResolvedValue([buildImage({ mime_type: 'image/png' })]);
      const stream = Readable.from([Buffer.from('fake-image-bytes')]);
      vi.spyOn(MinIOClient, 'downloadFile').mockResolvedValue(
        stream as unknown as Awaited<
          ReturnType<typeof MinIOClient.downloadFile>
        >
      );

      const result = await ManifestHelper.loadConnectorLogosBase64([
        CONNECTOR_ID,
      ]);

      expect(result.get(CONNECTOR_ID)).toBe(
        `data:image/png;base64,${Buffer.from('fake-image-bytes').toString('base64')}`
      );
    });

    it('falls back to image/png when the logo document has no mime_type', async () => {
      vi.spyOn(
        DocumentChildrenDomain,
        'loadImagesByParentIds'
      ).mockResolvedValue([buildImage({ mime_type: null })]);
      const stream = Readable.from([Buffer.from('fake-image-bytes')]);
      vi.spyOn(MinIOClient, 'downloadFile').mockResolvedValue(
        stream as unknown as Awaited<
          ReturnType<typeof MinIOClient.downloadFile>
        >
      );

      const result = await ManifestHelper.loadConnectorLogosBase64([
        CONNECTOR_ID,
      ]);

      expect(result.get(CONNECTOR_ID)).toBe(
        `data:image/png;base64,${Buffer.from('fake-image-bytes').toString('base64')}`
      );
    });

    it('isolates a single connector logo failure: other connectors still resolve', async () => {
      vi.spyOn(
        DocumentChildrenDomain,
        'loadImagesByParentIds'
      ).mockResolvedValue([
        buildImage({
          _parent_id: CONNECTOR_ID,
          minio_name: 'failing-logo-name',
        }),
        buildImage({
          _parent_id: CONNECTOR_ID_2,
          minio_name: 'ok-logo-name',
        }),
      ]);
      const stream = Readable.from([Buffer.from('fake-image-bytes')]);
      vi.spyOn(MinIOClient, 'downloadFile').mockImplementation(
        async (minioName: string) => {
          if (minioName === 'failing-logo-name') {
            throw new Error('MinIO is down');
          }
          return stream as unknown as Awaited<
            ReturnType<typeof MinIOClient.downloadFile>
          >;
        }
      );

      const result = await ManifestHelper.loadConnectorLogosBase64([
        CONNECTOR_ID,
        CONNECTOR_ID_2,
      ]);

      expect(result.get(CONNECTOR_ID)).toBeNull();
      expect(result.get(CONNECTOR_ID_2)).toBe(
        `data:image/png;base64,${Buffer.from('fake-image-bytes').toString('base64')}`
      );
      expect(logApp.error).toHaveBeenCalledWith(
        '[MANIFEST] Failed to load connector logo',
        expect.objectContaining({ connectorId: CONNECTOR_ID })
      );
    });

    it('returns null for every connector and logs once when the batched query throws', async () => {
      vi.spyOn(
        DocumentChildrenDomain,
        'loadImagesByParentIds'
      ).mockRejectedValue(new Error('DB connection lost'));

      const result = await ManifestHelper.loadConnectorLogosBase64([
        CONNECTOR_ID,
        CONNECTOR_ID_2,
      ]);

      expect(result.get(CONNECTOR_ID)).toBeNull();
      expect(result.get(CONNECTOR_ID_2)).toBeNull();
      expect(logApp.error).toHaveBeenCalledWith(
        '[MANIFEST] Failed to load connector logo documents',
        expect.objectContaining({
          connectorIds: [CONNECTOR_ID, CONNECTOR_ID_2],
        })
      );
    });

    it('returns null and logs an error when the download stream errors', async () => {
      vi.spyOn(
        DocumentChildrenDomain,
        'loadImagesByParentIds'
      ).mockResolvedValue([buildImage()]);
      const stream = new Readable({
        read() {
          this.emit('error', new Error('stream broke'));
        },
      });
      vi.spyOn(MinIOClient, 'downloadFile').mockResolvedValue(
        stream as unknown as Awaited<
          ReturnType<typeof MinIOClient.downloadFile>
        >
      );

      const result = await ManifestHelper.loadConnectorLogosBase64([
        CONNECTOR_ID,
      ]);

      expect(result.get(CONNECTOR_ID)).toBeNull();
      expect(logApp.error).toHaveBeenCalledWith(
        '[MANIFEST] Failed to load connector logo',
        expect.objectContaining({ connectorId: CONNECTOR_ID })
      );
    });
  });
});
