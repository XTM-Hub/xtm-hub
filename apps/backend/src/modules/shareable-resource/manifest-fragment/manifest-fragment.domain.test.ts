import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { database } from '../../../../knexfile';
import { TestHelper } from '../../../../tests/helper/test.helper';
import {
  DocumentMetadataKeyCode,
  DocumentSourceType,
  LicenseType,
  ManifestType,
  PortalCapability,
  type ManifestFragmentInput,
} from '../../../__generated__/resolvers-types';
import { requestContext } from '../../../context/request.context';
import type { DocumentId } from '../../../model/kanel/public/Document';
import type { DocumentMetadataKey } from '../../../model/kanel/public/DocumentMetadata';
import { ObjectSolutionCategoryObjectId } from '../../../model/kanel/public/ObjectSolutionCategory';
import { SYSTEM_USER_CONTEXT } from '../../../portal.const';
import { minioInit } from '../../../server/initialize';
import { BadRequestErrorCode } from '../../../utils/error/error.code';
import { IntegrationCoverageDomain } from '../opencti/integration/integration-coverage/integration-coverage.domain';
import {
  CONNECTOR_SLUG_LOCK_NAMESPACE,
  INTEGRATION_SERVICE_INSTANCE_ID,
  OPENCTI_INTEGRATION_DOCUMENT_TYPE,
} from '../opencti/integration/integration.model';
import { ManifestFragmentDomain } from './manifest-fragment.domain';

const SEEDED_SOLUTION_CATEGORY_ID = '8d121337-1a45-4b8b-ba73-f4e879c2e16a';
const SEEDED_SOLUTION_CATEGORY_NAME = 'SolutionCategory';
describe('manifestFragmentDomain', () => {
  beforeAll(async () => {
    await minioInit();
  });

  let _createdDocumentIds: string[] = [];
  const _manifestIngestionUser = {
    ...SYSTEM_USER_CONTEXT.user,
    capabilities: [
      {
        id: 'manifest-ingestions-capability' as never,
        name: PortalCapability.ManageManifestIngestions,
      },
    ],
  };

  beforeEach(() => {
    requestContext.set({
      user: _manifestIngestionUser,
    });
  });

  afterEach(async () => {
    if (_createdDocumentIds.length === 0) {
      return;
    }

    for (const documentId of _createdDocumentIds) {
      await TestHelper.documentMetadata.delete({
        document_id: documentId as DocumentId,
      });
      await TestHelper.document.delete({ id: documentId as DocumentId });
    }

    _createdDocumentIds = [];
  });

  const buildManifestFragment = (
    integrationType: string,
    {
      slug = 'misp',
      id = 'abc123',
      version = '7.260309.0-lts.5',
    }: {
      slug?: string;
      id?: string;
      version?: string;
    } = {}
  ): ManifestFragmentInput => {
    return {
      id,
      title: 'MISP',
      slug,
      description:
        'The MISP connector imports threat intelligence from MISP instances into OpenCTI.',
      short_description:
        'Import threat intelligence events, indicators, and observables from MISP instances.',
      logo: 'SGVsbG8sIFdvcmxkIQ==',
      use_cases: ['Open Source Threat Intel'],
      verified: true,
      last_verified_date: '2025-01-01',
      subscription_link: 'https://www.misp-project.org',
      source_code:
        'https://github.com/OpenCTI-Platform/connectors/tree/master/external-import/misp',
      manager_supported: true,
      min_version: '7.260507.0',
      version,
      image_name: 'opencti/connector-misp',
      image_type: 'EXTERNAL_IMPORT',
      platform: 'OpenCTI',
      integration_type: integrationType,
      license_type: LicenseType.Commercial,
      contact: 'https://github.com/some-contributor',
      solution_categories: [SEEDED_SOLUTION_CATEGORY_NAME],
      additional_properties: {
        max_confidence_level: 50,
      },
      config_schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'https://www.filigran.io/connectors/misp_config.schema.json',
        type: 'object',
        required: ['OPENCTI_URL', 'OPENCTI_TOKEN'],
        properties: {
          OPENCTI_URL: {
            type: 'string',
            format: 'uri',
            description: 'The base URL of the OpenCTI instance.',
          },
          OPENCTI_TOKEN: {
            type: 'string',
            description: 'The API token to connect to OpenCTI.',
          },
        },
        additionalProperties: true,
      },
    };
  };

  describe('ingestManifestFragment', () => {
    it('accepts a fragment when integration_type is connector', async () => {
      // Given
      const slug = 'misp-integration';
      const fragment = buildManifestFragment(ManifestType.Connector, { slug });

      // When
      await ManifestFragmentDomain.ingestManifestFragment(fragment);

      // Then
      const createdDocument = await TestHelper.document.load({ slug });
      _createdDocumentIds.push(createdDocument!.id);

      expect(createdDocument).toMatchObject({
        name: 'MISP',
        slug,
        description:
          'The MISP connector imports threat intelligence from MISP instances into OpenCTI.',
        short_description:
          'Import threat intelligence events, indicators, and observables from MISP instances.',
        type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        source_type: DocumentSourceType.External,
        service_instance_id: INTEGRATION_SERVICE_INSTANCE_ID,
        version: '7.260309.0-lts.5',
      });
      expect(createdDocument!.tags).toContain('decoupling');
      expect(createdDocument!.tags).toContain('latest-lts');

      const metadataRows = await TestHelper.documentMetadata.loadAll({
        document_id: createdDocument!.id,
      });

      const metadataByKey = new Map(
        metadataRows.map((metadata) => [metadata.key as string, metadata.value])
      );
      expect(metadataByKey.get(DocumentMetadataKeyCode.ImageName)).toBe(
        'opencti/connector-misp'
      );
      expect(metadataByKey.get(DocumentMetadataKeyCode.ImageType)).toBe(
        'EXTERNAL_IMPORT'
      );
      expect(
        metadataByKey.get(DocumentMetadataKeyCode.ManifestFragmentId)
      ).toBe(fragment.id);
      expect(metadataByKey.get(DocumentMetadataKeyCode.Verified)).toBe(
        String(fragment.verified)
      );
      expect(metadataByKey.get(DocumentMetadataKeyCode.LastVerifiedDate)).toBe(
        fragment.last_verified_date
      );
      expect(metadataByKey.get(DocumentMetadataKeyCode.IntegrationType)).toBe(
        fragment.integration_type
      );
      expect(metadataByKey.get(DocumentMetadataKeyCode.SourceCode)).toBe(
        fragment.source_code
      );
      expect(metadataByKey.get(DocumentMetadataKeyCode.ManagerSupported)).toBe(
        String(fragment.manager_supported)
      );
      expect(
        metadataByKey.get(DocumentMetadataKeyCode.MinimumDeployableVersion)
      ).toBe(fragment.min_version);
      expect(
        metadataByKey.get(
          DocumentMetadataKeyCode.MinimumDeployableVersionPadded
        )
      ).toBe('007.260507.000');
      expect(metadataByKey.get(DocumentMetadataKeyCode.VersionPadded)).toBe(
        '007.260309.000.LTS.005'
      );
      expect(
        metadataByKey.get(DocumentMetadataKeyCode.AdditionalProperties)
      ).toBe(JSON.stringify(fragment.additional_properties));
      expect(metadataByKey.get(DocumentMetadataKeyCode.ConfigSchema)).toBe(
        JSON.stringify(fragment.config_schema)
      );
      expect(metadataByKey.get(DocumentMetadataKeyCode.LicenseType)).toBe(
        fragment.license_type
      );
      expect(metadataByKey.get(DocumentMetadataKeyCode.Contact)).toBe(
        fragment.contact
      );
    });

    it('does not store a contact when the fragment leaves it empty', async () => {
      // Given a Filigran-supported integration, which carries no contact
      const slug = 'misp-without-contact';
      const fragment = buildManifestFragment(ManifestType.Connector, { slug });
      fragment.contact = undefined;

      // When
      await ManifestFragmentDomain.ingestManifestFragment(fragment);

      // Then
      const createdDocument = await TestHelper.document.load({ slug });
      _createdDocumentIds.push(createdDocument!.id);

      const metadataRows = await TestHelper.documentMetadata.loadAll({
        document_id: createdDocument!.id,
      });
      const metadataByKey = new Map(
        metadataRows.map((metadata) => [metadata.key as string, metadata.value])
      );
      expect(metadataByKey.get(DocumentMetadataKeyCode.Contact)).toBeNull();
    });

    it('accepts a fragment with a null subscription_link', async () => {
      // Given a fragment ingested without a subscription link
      const slug = 'misp-without-subscription-link';
      const fragment = buildManifestFragment(ManifestType.Connector, { slug });
      fragment.subscription_link = null;

      // When
      await ManifestFragmentDomain.ingestManifestFragment(fragment);

      // Then
      const createdDocument = await TestHelper.document.load({ slug });
      _createdDocumentIds.push(createdDocument!.id);

      const metadataRows = await TestHelper.documentMetadata.loadAll({
        document_id: createdDocument!.id,
      });
      const metadataByKey = new Map(
        metadataRows.map((metadata) => [metadata.key as string, metadata.value])
      );
      expect(
        metadataByKey.get(DocumentMetadataKeyCode.SubscriptionLink)
      ).toBeNull();
    });

    it('links the fragment solution categories to the created connector', async () => {
      // Given the seeded category, scoped to opencti
      const slug = 'misp-with-categories';
      const fragment = buildManifestFragment(ManifestType.Connector, { slug });
      fragment.solution_categories = [SEEDED_SOLUTION_CATEGORY_NAME];
      // When the fragment is ingested, its platform being 'OpenCTI' in mixed case
      await ManifestFragmentDomain.ingestManifestFragment(fragment);

      // Then the category is linked, so the product lookup is case-insensitive
      const createdDocument = await TestHelper.document.load({ slug });
      _createdDocumentIds.push(createdDocument!.id);

      const links = await TestHelper.objectSolutionCategory.load({
        object_id: createdDocument!
          .id as unknown as ObjectSolutionCategoryObjectId,
      });
      expect(links).toHaveLength(1);
      expect(links[0]!.solution_category_id).toBe(SEEDED_SOLUTION_CATEGORY_ID);
    });

    it('ignores an unknown solution category and still links the known one', async () => {
      // Given a fragment declaring one seeded category and one that does not exist
      const slug = 'misp-unknown-category';
      const fragment = buildManifestFragment(ManifestType.Connector, { slug });
      fragment.solution_categories = [
        SEEDED_SOLUTION_CATEGORY_NAME,
        'Quantum Threat Divination',
      ];
      // When the fragment is ingested
      await ManifestFragmentDomain.ingestManifestFragment(fragment);

      // Then the ingestion succeeds and only the known category is linked
      const createdDocument = await TestHelper.document.load({ slug });
      _createdDocumentIds.push(createdDocument!.id);

      const links = await TestHelper.objectSolutionCategory.load({
        object_id: createdDocument!
          .id as unknown as ObjectSolutionCategoryObjectId,
      });
      expect(links).toHaveLength(1);
      expect(links[0]!.solution_category_id).toBe(SEEDED_SOLUTION_CATEGORY_ID);
    });

    it('throws when integration_type is not connector', async () => {
      // Given
      const slug = 'misp-invalid';
      const fragment = buildManifestFragment('third_party_integration', {
        slug,
      });

      // When
      const call = ManifestFragmentDomain.ingestManifestFragment(fragment);

      // Then
      await expect(call).rejects.toThrow(
        BadRequestErrorCode.IntegrationTypeNotRecognized
      );

      const createdDocument = await TestHelper.document.load({ slug });
      expect(createdDocument).toBeUndefined();
    });

    it('throws when min_version format is invalid', async () => {
      // Given
      const slug = 'misp-invalid-min-version';
      const fragment = buildManifestFragment(ManifestType.Connector, {
        slug,
      });
      fragment.min_version = '>= 7.260507.0';

      // When
      const call = ManifestFragmentDomain.ingestManifestFragment(fragment);

      // Then
      await expect(call).rejects.toThrow(
        BadRequestErrorCode.InvalidManifestVersionFormat
      );

      const createdDocument = await TestHelper.document.load({ slug });
      expect(createdDocument).toBeUndefined();
    });

    it('throws when short_description is longer than 250 characters', async () => {
      // Given
      const slug = 'misp-invalid-short-description';
      const fragment = buildManifestFragment(ManifestType.Connector, {
        slug,
      });
      fragment.short_description = 'a'.repeat(251);

      // When
      const call = ManifestFragmentDomain.ingestManifestFragment(fragment);

      // Then
      await expect(call).rejects.toThrow(
        BadRequestErrorCode.ShortDescriptionTooLong
      );

      const createdDocument = await TestHelper.document.load({ slug });
      expect(createdDocument).toBeUndefined();
    });

    it.each`
      solutionCategories | description      | slug
      ${[]}              | ${'empty array'} | ${'misp-empty-solution-categories'}
      ${null}            | ${'null'}        | ${'misp-null-solution-categories'}
    `(
      'throws when solution_categories is $description',
      async ({ solutionCategories, slug }) => {
        // Given
        const fragment = buildManifestFragment(ManifestType.Connector, {
          slug,
        });
        fragment.solution_categories = solutionCategories;

        // When
        const call = ManifestFragmentDomain.ingestManifestFragment(fragment);

        // Then
        await expect(call).rejects.toThrow(
          BadRequestErrorCode.SolutionCategoriesRequired
        );

        const createdDocument = await TestHelper.document.load({ slug });
        expect(createdDocument).toBeUndefined();
      }
    );

    it('rejects when connector id already exists under a different slug', async () => {
      // Given
      const connectorId = 'shared-connector-id';
      const existingDocument = await TestHelper.document.create({
        slug: 'misp-existing-same',
        type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        service_instance_id: INTEGRATION_SERVICE_INSTANCE_ID,
        source_type: DocumentSourceType.External,
        version: '7.260309.0-lts.5',
        tags: ['decoupling', 'latest-lts'],
      });
      _createdDocumentIds.push(existingDocument.id);

      await TestHelper.documentMetadata.create({
        document_id: existingDocument.id,
        key: DocumentMetadataKeyCode.ManifestFragmentId as DocumentMetadataKey,
        value: connectorId,
      });
      await TestHelper.documentMetadata.create({
        document_id: existingDocument.id,
        key: DocumentMetadataKeyCode.VersionPadded as DocumentMetadataKey,
        value: '007.260309.000.LTS.005',
      });

      const slug = 'misp-new-same-version';
      const fragment = buildManifestFragment(ManifestType.Connector, {
        slug,
        id: connectorId,
      });

      // When
      const call = ManifestFragmentDomain.ingestManifestFragment(fragment);

      // Then
      await expect(call).rejects.toThrow(
        BadRequestErrorCode.ConnectorIdAlreadyExists
      );

      const newDocument = await TestHelper.document.load({ slug });
      expect(newDocument).toBeUndefined();
    });

    it('accepts same version when connector exists under a different slug and connector id differs', async () => {
      // Given
      const existingDocument = await TestHelper.document.create({
        slug: 'misp-existing-same-id-different',
        type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        service_instance_id: INTEGRATION_SERVICE_INSTANCE_ID,
        source_type: DocumentSourceType.External,
        version: '7.260309.0-lts.5',
        tags: ['decoupling', 'latest-lts'],
      });
      _createdDocumentIds.push(existingDocument.id);

      await TestHelper.documentMetadata.create({
        document_id: existingDocument.id,
        key: DocumentMetadataKeyCode.ManifestFragmentId as DocumentMetadataKey,
        value: 'existing-connector-id',
      });
      await TestHelper.documentMetadata.create({
        document_id: existingDocument.id,
        key: DocumentMetadataKeyCode.VersionPadded as DocumentMetadataKey,
        value: '007.260309.000.LTS.005',
      });

      const slug = 'misp-new-same-version-different-id';
      const fragment = buildManifestFragment(ManifestType.Connector, {
        slug,
        id: 'new-connector-id',
      });

      // When
      const call = ManifestFragmentDomain.ingestManifestFragment(fragment);

      // Then
      await expect(call).resolves.toBeUndefined();

      const newDocument = await TestHelper.document.load({ slug });
      expect(newDocument).toMatchObject({
        slug,
        version: fragment.version,
      });
      _createdDocumentIds.push(newDocument!.id);
    });

    it('removes latest-lts from existing connector and creates a new latest-lts connector for same slug', async () => {
      // Given
      const existingDocument = await TestHelper.document.create({
        slug: 'misp-lts-family',
        type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        service_instance_id: INTEGRATION_SERVICE_INSTANCE_ID,
        source_type: DocumentSourceType.External,
        version: '7.260308.0-lts.4',
        tags: ['decoupling', 'latest-lts'],
      });
      _createdDocumentIds.push(existingDocument.id);

      await TestHelper.documentMetadata.create({
        document_id: existingDocument.id,
        key: DocumentMetadataKeyCode.ManifestFragmentId as DocumentMetadataKey,
        value: 'abc123',
      });
      await TestHelper.documentMetadata.create({
        document_id: existingDocument.id,
        key: DocumentMetadataKeyCode.VersionPadded as DocumentMetadataKey,
        value: '007.260308.000.LTS.004',
      });
      await TestHelper.documentMetadata.create({
        document_id: existingDocument.id,
        key: DocumentMetadataKeyCode.DatasheetUrl as DocumentMetadataKey,
        value: 'https://filigran.io/datasheet',
      });
      await TestHelper.documentMetadata.create({
        document_id: existingDocument.id,
        key: DocumentMetadataKeyCode.BlogpostUrl as DocumentMetadataKey,
        value: 'https://filigran.io/blogpost',
      });
      await TestHelper.documentMetadata.create({
        document_id: existingDocument.id,
        key: DocumentMetadataKeyCode.DemoUrl as DocumentMetadataKey,
        value: 'https://filigran.io/demo',
      });

      const connectorFamilySlug = 'misp-lts-family';
      const fragment = buildManifestFragment(ManifestType.Connector, {
        slug: connectorFamilySlug,
      });

      // When
      await ManifestFragmentDomain.ingestManifestFragment(fragment);

      // Then
      const updatedExisting = await TestHelper.document.load({
        id: existingDocument.id,
      });
      expect(updatedExisting).toBeDefined();
      expect(updatedExisting!.tags).toContain('decoupling');
      expect(updatedExisting!.tags).not.toContain('latest-lts');

      const newDocument = await TestHelper.document.load({
        slug: connectorFamilySlug,
        version: fragment.version,
      });
      expect(newDocument).toBeDefined();
      _createdDocumentIds.push(newDocument!.id);
      expect(newDocument!.tags).toContain('decoupling');
      expect(newDocument!.tags).toContain('latest-lts');

      const metadataRows = await TestHelper.documentMetadata.loadAll({
        document_id: newDocument!.id,
      });
      const metadataByKey = new Map(
        metadataRows.map((metadata) => [metadata.key as string, metadata.value])
      );
      expect(metadataByKey.get(DocumentMetadataKeyCode.DatasheetUrl)).toBe(
        'https://filigran.io/datasheet'
      );
      expect(metadataByKey.get(DocumentMetadataKeyCode.BlogpostUrl)).toBe(
        'https://filigran.io/blogpost'
      );
      expect(metadataByKey.get(DocumentMetadataKeyCode.DemoUrl)).toBe(
        'https://filigran.io/demo'
      );
    });

    it('removes latest from existing connector and creates a new latest connector for same slug', async () => {
      // Given
      const existingDocument = await TestHelper.document.create({
        slug: 'misp-non-lts-family',
        type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        service_instance_id: INTEGRATION_SERVICE_INSTANCE_ID,
        source_type: DocumentSourceType.External,
        version: '7.260308.0',
        tags: ['decoupling', 'latest'],
      });
      _createdDocumentIds.push(existingDocument.id);

      await TestHelper.documentMetadata.create({
        document_id: existingDocument.id,
        key: DocumentMetadataKeyCode.ManifestFragmentId as DocumentMetadataKey,
        value: 'abc123',
      });
      await TestHelper.documentMetadata.create({
        document_id: existingDocument.id,
        key: DocumentMetadataKeyCode.VersionPadded as DocumentMetadataKey,
        value: '007.260308.000',
      });

      const connectorFamilySlug = 'misp-non-lts-family';
      const fragment = buildManifestFragment(ManifestType.Connector, {
        slug: connectorFamilySlug,
        version: '7.260309.0',
      });

      // When
      await ManifestFragmentDomain.ingestManifestFragment(fragment);

      // Then
      const updatedExisting = await TestHelper.document.load({
        id: existingDocument.id,
      });
      expect(updatedExisting).toBeDefined();
      expect(updatedExisting!.tags).toContain('decoupling');
      expect(updatedExisting!.tags).not.toContain('latest');

      const newDocument = await TestHelper.document.load({
        slug: connectorFamilySlug,
        version: fragment.version,
      });
      expect(newDocument).toBeDefined();
      _createdDocumentIds.push(newDocument!.id);
      expect(newDocument!.tags).toContain('decoupling');
      expect(newDocument!.tags).toContain('latest');
      expect(newDocument!.tags).not.toContain('latest-lts');
    });

    it('promotes latest tag to the newer version when the same slug is ingested twice', async () => {
      // Given
      const slug = 'misp-same-slug-newer-version';
      const firstFragment = buildManifestFragment(ManifestType.Connector, {
        slug,
        version: '7.260308.0',
      });
      const secondFragment = buildManifestFragment(ManifestType.Connector, {
        slug,
        version: '7.260309.0',
      });

      // When
      await ManifestFragmentDomain.ingestManifestFragment(firstFragment);
      await ManifestFragmentDomain.ingestManifestFragment(secondFragment);

      // Then
      const connectors = await TestHelper.document.loadAll({
        slug,
        type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        service_instance_id: INTEGRATION_SERVICE_INSTANCE_ID,
      });
      expect(connectors).toHaveLength(2);
      _createdDocumentIds.push(...connectors.map((connector) => connector.id));

      const oldDocument = connectors.find(
        (connector) => connector.version === firstFragment.version
      );
      const newDocument = connectors.find(
        (connector) => connector.version === secondFragment.version
      );

      expect(oldDocument).toMatchObject({
        slug,
        version: firstFragment.version,
      });
      expect(newDocument).toMatchObject({
        slug,
        version: secondFragment.version,
      });
      expect(newDocument!.tags).toContain('latest');
      expect(oldDocument!.tags).not.toContain('latest');
    });

    it('keeps current latest when incoming version is lower', async () => {
      // Given

      const connectorFamilySlug = 'misp-keep-latest-family';
      const existingDocument = await TestHelper.document.create({
        slug: connectorFamilySlug,
        type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        service_instance_id: INTEGRATION_SERVICE_INSTANCE_ID,
        source_type: DocumentSourceType.External,
        version: '7.260309.0',
        tags: ['decoupling', 'latest'],
      });
      _createdDocumentIds.push(existingDocument.id);

      await TestHelper.documentMetadata.create({
        document_id: existingDocument.id,
        key: DocumentMetadataKeyCode.ManifestFragmentId as DocumentMetadataKey,
        value: 'abc123',
      });
      await TestHelper.documentMetadata.create({
        document_id: existingDocument.id,
        key: DocumentMetadataKeyCode.VersionPadded as DocumentMetadataKey,
        value: '007.260309.000',
      });

      const fragment = buildManifestFragment(ManifestType.Connector, {
        slug: connectorFamilySlug,
        version: '7.260308.0',
      });

      // When
      await ManifestFragmentDomain.ingestManifestFragment(fragment);

      // Then
      const updatedExisting = await TestHelper.document.load({
        id: existingDocument.id,
      });
      expect(updatedExisting).toBeDefined();
      expect(updatedExisting!.tags).toContain('latest');

      const newDocument = await TestHelper.document.load({
        slug: connectorFamilySlug,
        version: fragment.version,
      });
      expect(newDocument).toBeDefined();
      _createdDocumentIds.push(newDocument!.id);
      expect(newDocument!.tags).toContain('decoupling');
      expect(newDocument!.tags).not.toContain('latest');
      expect(newDocument!.tags).not.toContain('latest-lts');
    });
  });

  describe('ingestManifestFragment coverage', () => {
    const loadIngestedCoverage = async (slug: string, version: string) => {
      const document = await TestHelper.document.load({ slug, version });
      _createdDocumentIds.push(document!.id);
      return IntegrationCoverageDomain.loadStoredCoverage(document!.id);
    };

    it('stores the coverage declared by the fragment', async () => {
      // Given
      const slug = 'misp-coverage-declared';
      const fragment = {
        ...buildManifestFragment(ManifestType.Connector, {
          slug,
          id: 'coverage-declared',
        }),
        coverage: { object_types: ['indicator'], sectors: ['Finance'] },
      };

      // When
      await ManifestFragmentDomain.ingestManifestFragment(fragment);

      // Then
      expect(await loadIngestedCoverage(slug, fragment.version)).toEqual({
        object_types: ['Indicator'],
        sectors: ['Finance'],
        regions: [],
        inferred: false,
      });
    });

    it('infers the coverage when the fragment declares none', async () => {
      // Given
      const slug = 'misp-coverage-inferred';
      const fragment = buildManifestFragment(ManifestType.Connector, {
        slug,
        id: 'coverage-inferred',
      });

      // When
      await ManifestFragmentDomain.ingestManifestFragment(fragment);

      // Then
      expect(await loadIngestedCoverage(slug, fragment.version)).toEqual({
        object_types: ['Indicator'],
        sectors: [],
        regions: [],
        inferred: true,
      });
    });

    it('carries the declared coverage of the previous version over to a new version', async () => {
      // Given
      const slug = 'misp-coverage-carried';
      const firstFragment = {
        ...buildManifestFragment(ManifestType.Connector, {
          slug,
          id: 'coverage-carried',
          version: '7.260308.0',
        }),
        coverage: { regions: ['Global'] },
      };
      const secondFragment = buildManifestFragment(ManifestType.Connector, {
        slug,
        id: 'coverage-carried',
        version: '7.260309.0',
      });
      await ManifestFragmentDomain.ingestManifestFragment(firstFragment);
      await loadIngestedCoverage(slug, firstFragment.version);

      // When
      await ManifestFragmentDomain.ingestManifestFragment(secondFragment);

      // Then
      expect(await loadIngestedCoverage(slug, secondFragment.version)).toEqual({
        object_types: [],
        sectors: [],
        regions: ['Global'],
        inferred: false,
      });
    });

    it('throws when the declared coverage exceeds the bounds', async () => {
      // Given
      const fragment = {
        ...buildManifestFragment(ManifestType.Connector, {
          slug: 'misp-coverage-invalid',
          id: 'coverage-invalid',
        }),
        coverage: { object_types: ['x'.repeat(129)] },
      };

      // When
      const call = ManifestFragmentDomain.ingestManifestFragment(fragment);

      // Then
      await expect(call).rejects.toThrow(
        BadRequestErrorCode.InvalidIntegrationCoverage
      );
    });
  });

  describe('ingestManifestFragment concurrency', () => {
    it('waits for the ingestion lock of its slug even when the connector family has no row yet', async () => {
      // Given: another ingestion of the same brand-new family holds the slug lock
      const slug = 'misp-coverage-serialized';
      const fragment = buildManifestFragment(ManifestType.Connector, {
        slug,
        id: 'coverage-serialized',
      });
      let settled = false;
      let ingestion: Promise<void> | undefined;

      // When
      await database.transaction(async (trx) => {
        await trx.raw(
          'SELECT pg_advisory_xact_lock(hashtext(?), hashtext(?))',
          [CONNECTOR_SLUG_LOCK_NAMESPACE, slug]
        );
        ingestion = ManifestFragmentDomain.ingestManifestFragment(
          fragment
        ).finally(() => {
          settled = true;
        });
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Then: it reads the family only once the lock is released
        expect(settled).toBe(false);
      });
      await ingestion;
      expect(settled).toBe(true);
      const createdDocument = await TestHelper.document.load({ slug });
      expect(createdDocument).toBeDefined();
      _createdDocumentIds.push(createdDocument!.id);
    });

    it('rejects one of two concurrent ingestions of the very first version of a brand-new connector', async () => {
      // Given: no existing rows to lock, so the DB unique constraint is the backstop
      const slug = 'misp-concurrent-first-insert';
      const manifestId = 'concurrent-first-insert-id';
      const fragmentA = buildManifestFragment(ManifestType.Connector, {
        slug,
        id: manifestId,
      });
      const fragmentB = buildManifestFragment(ManifestType.Connector, {
        slug,
        id: manifestId,
      });

      // When
      const results = await Promise.allSettled([
        ManifestFragmentDomain.ingestManifestFragment(fragmentA),
        ManifestFragmentDomain.ingestManifestFragment(fragmentB),
      ]);

      // Then: only one succeeds
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason.message).toBe(
        BadRequestErrorCode.ConnectorVersionAlreadyExists
      );

      const createdDocument = await TestHelper.document.load({ slug });
      expect(createdDocument).toBeDefined();
      _createdDocumentIds.push(createdDocument!.id);
    });

    it('promotes exactly one connector as latest when two new versions are ingested concurrently for the same connector family', async () => {
      // Given: an existing latest connector in one family
      const connectorFamilySlug = 'misp-concurrent-family';
      const manifestId = 'concurrent-family-id';
      const existingDocument = await TestHelper.document.create({
        slug: connectorFamilySlug,
        type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        service_instance_id: INTEGRATION_SERVICE_INSTANCE_ID,
        source_type: DocumentSourceType.External,
        version: '7.260307.0',
        tags: ['decoupling', 'latest'],
      });
      _createdDocumentIds.push(existingDocument.id);

      await TestHelper.documentMetadata.create({
        document_id: existingDocument.id,
        key: DocumentMetadataKeyCode.ManifestFragmentId as DocumentMetadataKey,
        value: manifestId,
      });
      await TestHelper.documentMetadata.create({
        document_id: existingDocument.id,
        key: DocumentMetadataKeyCode.VersionPadded as DocumentMetadataKey,
        value: '007.260307.000',
      });

      const lowerVersionFragment = buildManifestFragment(
        ManifestType.Connector,
        {
          slug: connectorFamilySlug,
          id: manifestId,
          version: '7.260308.0',
        }
      );
      const higherVersionFragment = buildManifestFragment(
        ManifestType.Connector,
        {
          slug: connectorFamilySlug,
          id: manifestId,
          version: '7.260309.0',
        }
      );

      // When: two newer versions are ingested concurrently for the same family
      await Promise.all([
        ManifestFragmentDomain.ingestManifestFragment(lowerVersionFragment),
        ManifestFragmentDomain.ingestManifestFragment(higherVersionFragment),
      ]);

      // Then: only the highest version remains latest across the family
      const connectors = await TestHelper.document.loadAll({
        slug: connectorFamilySlug,
        type: OPENCTI_INTEGRATION_DOCUMENT_TYPE,
        service_instance_id: INTEGRATION_SERVICE_INSTANCE_ID,
      });

      expect(connectors).toHaveLength(3);
      _createdDocumentIds.push(
        ...connectors
          .map((connector) => connector.id)
          .filter((id) => id !== existingDocument.id)
      );

      const latestConnectors = connectors.filter((connector) =>
        connector.tags.includes('latest')
      );
      expect(latestConnectors).toHaveLength(1);
      expect(latestConnectors[0]).toMatchObject({
        slug: connectorFamilySlug,
        version: higherVersionFragment.version,
      });

      const lowerVersionDocument = connectors.find(
        (connector) => connector.version === lowerVersionFragment.version
      );
      const previousLatestDocument = connectors.find(
        (connector) => connector.id === existingDocument.id
      );
      expect(lowerVersionDocument).toMatchObject({
        slug: connectorFamilySlug,
        version: lowerVersionFragment.version,
      });
      expect(lowerVersionDocument!.tags).not.toContain('latest');
      expect(previousLatestDocument).toMatchObject({
        slug: connectorFamilySlug,
        version: '7.260307.0',
      });
      expect(previousLatestDocument!.tags).not.toContain('latest');
    });
  });
});
