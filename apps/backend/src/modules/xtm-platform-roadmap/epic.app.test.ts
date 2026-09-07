import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import { SERVICES, TEST_ORGANIZATIONS } from '../../../tests/tests.const';
import {
  EditionType,
  EpicOrdering,
  EpicType,
  FiligranProduct,
  OrderingMode,
  ServiceDefinitionIdentifier,
  Timeline,
} from '../../__generated__/resolvers-types';
import { DocumentId } from '../../model/kanel/public/Document';
import { EpicId } from '../../model/kanel/public/Epic';
import { OrganizationId } from '../../model/kanel/public/Organization';
import { MinIOClient } from '../../thirdparty/minio/client';
import { DocumentApp } from '../document/document.app';
import { DocumentUploadsHelper } from '../document/document.uploads.helper';
import { DocumentDomain } from '../document/domain/document.domain';

const guardMock = vi.hoisted(() => ({
  assertUserHasCapaOnService: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../security/guard', async () => {
  const actual = await vi.importActual<typeof import('../../security/guard')>(
    '../../security/guard'
  );

  return {
    ...actual,
    assertUserHasCapaOnService: guardMock.assertUserHasCapaOnService,
  };
});

import { ServiceInstanceDomain } from '../service/instance/service-instance.domain';
import { EpicApp } from './epic.app';
import { EpicDomain } from './epic.domain';

describe('epicApp', () => {
  const minioFileMock = {
    minioName: 'epic-image.png',
    mimeType: 'image/png',
    fileName: 'epic-image.png',
  };

  const basicInput = {
    title: 'Test Epic',
    short_description: 'Short desc',
    description: 'Long description for the epic',
    active: true,
    product: [FiligranProduct.Opencti],
    timeline: Timeline.Now,
    uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
    edition_type: EditionType.CommunityEdition,
  };

  beforeEach(async () => {
    guardMock.assertUserHasCapaOnService.mockResolvedValue(undefined);

    vi.spyOn(DocumentUploadsHelper, 'processUploads').mockResolvedValue([
      minioFileMock,
    ]);
  });

  afterEach(async () => {
    // Clean up the Document and Epic tables before each test
    await TestHelper.epic.delete({});
    await TestHelper.document.delete({ file_name: 'epic-image.png' });
  });

  describe('createEpic', () => {
    it('should createEpic with correct data and return the created epic', async () => {
      // When
      const createdEpic = await EpicApp.createEpic(basicInput, []);

      // Check in DB
      const dbEpic = await TestHelper.epic.load({
        id: createdEpic.id,
      });

      // Then
      expect(createdEpic).toMatchObject({
        id: expect.anything(),
        title: 'Test Epic',
        product: [FiligranProduct.Opencti],
        active: true,
      });

      expect(dbEpic).toMatchObject({
        title: 'Test Epic',
      });
    });

    it('should create an image document when upload is provided', async () => {
      // Given
      vi.spyOn(
        ServiceInstanceDomain,
        'loadSubscribedServiceInstancesByIdentifier'
      ).mockResolvedValue([
        {
          service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
          organization_id: 'test-org-id',
          is_personal_space: false,
          configurations: [],
        },
      ] as never);

      const input = {
        ...basicInput,
        title: 'Epic with Image',
      };

      const uploads = [
        {
          file: {} as never,
          promise: Promise.resolve({} as never),
        },
      ];

      // When
      const createdEpic = await EpicApp.createEpic(input, uploads);

      // Verify document was created in DB
      const dbDocument = await TestHelper.document.load({
        id: createdEpic!.document_id as DocumentId,
      });

      // Then
      expect(createdEpic).toMatchObject({
        id: expect.anything(),
        document_id: expect.anything(),
      });
      expect(dbDocument).toMatchObject({
        file_name: 'epic-image.png',
        minio_name: 'epic-image.png',
        mime_type: 'image/png',
        type: 'image',
        description: 'Epic illustration',
        active: true,
        source_type: 'internal',
      });
    });

    it('should create an integration epic when is_integration is true', async () => {
      // Given
      const input = {
        ...basicInput,
        title: 'Integration Epic',
        is_integration: true,
      };

      // When
      const createdEpic = await EpicApp.createEpic(input, []);

      // Check in DB
      const dbEpic = await TestHelper.epic.load({ id: createdEpic.id });

      // Then
      expect(createdEpic).toMatchObject({
        epic_type: EpicType.Integration,
      });

      expect(dbEpic?.epic_type).toBe(EpicType.Integration);
    });

    it('should create an epic with several products', async () => {
      // Given
      const input = {
        ...basicInput,
        title: 'Multi Product Epic',
        product: [FiligranProduct.Opencti, FiligranProduct.Openaev],
      };

      // When
      const createdEpic = await EpicApp.createEpic(input, []);

      // Check in DB
      const dbEpic = await TestHelper.epic.load({ id: createdEpic.id });

      // Then
      expect(createdEpic.product).toEqual([
        FiligranProduct.Opencti,
        FiligranProduct.Openaev,
      ]);

      expect(dbEpic?.product).toEqual([
        FiligranProduct.Opencti,
        FiligranProduct.Openaev,
      ]);
    });
  });

  describe('updateEpic', () => {
    it('should update the specified epic with the provided data and return the updated epic', async () => {
      // Given
      const createdEpic = await EpicApp.createEpic(basicInput, []);
      const updateInput = {
        title: 'Updated Title',
        short_description: 'Updated short description',
        active: true,
        edition_type: EditionType.CommunityEdition,
      };

      // When
      const updatedEpic = await EpicApp.updateEpic(
        createdEpic.id as EpicId,
        updateInput,
        []
      );

      // Check in DB
      const dbEpic = await TestHelper.epic.load({ title: 'Updated Title' });

      // Then
      expect(updatedEpic).toMatchObject({
        title: 'Updated Title',
        short_description: 'Updated short description',
        active: true,
        description: 'Long description for the epic',
      });

      expect(dbEpic).toMatchObject({
        title: 'Updated Title',
        active: true,
      });
    });
    it('should replace the products of the specified epic', async () => {
      // Given
      const createdEpic = await EpicApp.createEpic(basicInput, []);
      const updateInput = {
        product: [FiligranProduct.Openaev, FiligranProduct.Xtmhub],
        edition_type: EditionType.CommunityEdition,
      };

      // When
      const updatedEpic = await EpicApp.updateEpic(
        createdEpic.id as EpicId,
        updateInput,
        []
      );

      // Check in DB
      const dbEpic = await TestHelper.epic.load({ id: createdEpic.id });

      // Then
      expect(updatedEpic.product).toEqual([
        FiligranProduct.Openaev,
        FiligranProduct.Xtmhub,
      ]);

      expect(dbEpic?.product).toEqual([
        FiligranProduct.Openaev,
        FiligranProduct.Xtmhub,
      ]);
    });
    it('should update the specified epic with uploads and create a document', async () => {
      // Given
      vi.spyOn(
        ServiceInstanceDomain,
        'loadSubscribedServiceInstancesByIdentifier'
      ).mockResolvedValue([
        {
          service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
          organization_id: 'test-org-id',
          is_personal_space: false,
          configurations: [],
        },
      ] as never);

      const createdEpic = await EpicApp.createEpic(basicInput, []);

      expect(createdEpic.document_id).toBeNull();

      const updateInput = {
        title: 'Updated Title with Image',
        short_description: 'Updated short description',
        active: true,
        edition_type: EditionType.CommunityEdition,
      };

      const uploads = [
        {
          file: {} as never,
          promise: Promise.resolve({} as never),
        },
      ];

      // When
      const updatedEpic = await EpicApp.updateEpic(
        createdEpic.id,
        updateInput,
        uploads
      );

      // Check in DB
      const dbDocument = await TestHelper.document.load({
        id: updatedEpic?.document_id as DocumentId,
      });

      // Then
      expect(updatedEpic).toMatchObject({
        title: 'Updated Title with Image',
        document_id: expect.anything(),
      });

      expect(dbDocument).toMatchObject({
        file_name: 'epic-image.png',
      });
    });
  });

  describe('deleteEpic', () => {
    it('should delete the specified epic and return the deleted epic', async () => {
      // Given
      const createdEpic = await EpicApp.createEpic(basicInput, []);

      expect(createdEpic.id).toBeDefined();

      // When
      const deletedEpic = await EpicApp.deleteEpic(createdEpic.id as EpicId);

      // Then
      expect(deletedEpic).toMatchObject({
        id: createdEpic.id,
      });
    });
    it('should delete, when integration, the document and the minioFile as well', async () => {
      // Given
      const mockDeleteFileInMinio = vi
        .spyOn(MinIOClient, 'deleteFile')
        .mockResolvedValueOnce();

      const document = await DocumentApp.createDocumentWithChildrenAndMetadata(
        {
          id: 'bc348e84-3635-46de-9b56-38db09c35f4d' as DocumentId,
          uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
          description: 'description',
          minio_name: 'minioName',
          file_name: 'filename',
          uploader_organization_id:
            'ba091095-418f-4b4f-b150-6c9295e232c4' as OrganizationId,
          service_instance_id: SERVICES.INSTANCES.CUSTOM_DASHBOARDS.ID,
          type: ServiceDefinitionIdentifier.OpenctiCustomDashboards,
        },
        []
      );
      const createdEpic = await EpicDomain.createEpic({
        ...basicInput,
        document_id: document.id,
      });

      // When
      const deletedEpic = await EpicApp.deleteEpic(createdEpic?.id as EpicId);

      // Check in DB
      const documentFromDB = await DocumentDomain.loadDocumentBy({
        file_name: 'filename',
      });

      // Then
      expect(deletedEpic).toMatchObject({
        id: createdEpic?.id,
      });
      expect(mockDeleteFileInMinio).toHaveBeenCalledTimes(1);

      expect(documentFromDB).toBeUndefined();
    });
  });

  describe('countEpicsPerTimeline', () => {
    it('should return an empty list when no epics exist', async () => {
      // When
      const result = await EpicApp.countEpicsPerTimeline();

      // Then
      expect(result).toEqual([]);
    });

    it('should return counts grouped by timeline, excluding finished', async () => {
      // Given
      await EpicApp.createEpic(
        { ...basicInput, title: 'Now Epic 1', timeline: Timeline.Now },
        []
      );
      await EpicApp.createEpic(
        { ...basicInput, title: 'Now Epic 2', timeline: Timeline.Now },
        []
      );
      await EpicApp.createEpic(
        { ...basicInput, title: 'Next Epic', timeline: Timeline.Next },
        []
      );
      await EpicApp.createEpic(
        { ...basicInput, title: 'Finished Epic', timeline: Timeline.Finished },
        []
      );

      // When
      const result = await EpicApp.countEpicsPerTimeline();

      // Then
      expect(result).not.toContainEqual(
        expect.objectContaining({ timeline: Timeline.Finished })
      );

      const nowEntry = result.find((r) => r.timeline === Timeline.Now);
      const nextEntry = result.find((r) => r.timeline === Timeline.Next);

      expect(nowEntry).toMatchObject({ timeline: Timeline.Now, count: 2 });
      expect(nextEntry).toMatchObject({ timeline: Timeline.Next, count: 1 });
    });

    it('should not include finished epics even when they exist', async () => {
      // Given
      await EpicApp.createEpic(
        { ...basicInput, title: 'Finished 1', timeline: Timeline.Finished },
        []
      );
      await EpicApp.createEpic(
        { ...basicInput, title: 'Finished 2', timeline: Timeline.Finished },
        []
      );

      // When
      const result = await EpicApp.countEpicsPerTimeline();

      // Then
      expect(result).toEqual([]);
    });

    it('should return correct counts when only under_consideration epics exist', async () => {
      // Given
      await EpicApp.createEpic(
        {
          ...basicInput,
          title: 'UC Epic',
          timeline: Timeline.UnderConsideration,
        },
        []
      );

      // When
      const result = await EpicApp.countEpicsPerTimeline();

      // Then
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        timeline: Timeline.UnderConsideration,
        count: 1,
      });
    });

    it('should not count inactive epics', async () => {
      // Given
      await EpicApp.createEpic(
        { ...basicInput, title: 'Active Now Epic', timeline: Timeline.Now },
        []
      );
      await EpicApp.createEpic(
        {
          ...basicInput,
          title: 'Inactive Now Epic',
          timeline: Timeline.Now,
          active: false,
        },
        []
      );

      // When
      const result = await EpicApp.countEpicsPerTimeline();

      // Then
      const nowEntry = result.find((r) => r.timeline === Timeline.Now);
      expect(nowEntry).toMatchObject({ timeline: Timeline.Now, count: 1 });
    });
  });

  describe('loadEpics', () => {
    it('should return epics with pagination information using first and orderBy parameters', async () => {
      // Given
      await EpicApp.createEpic(
        {
          ...basicInput,
          title: 'Epic 1',
        },
        []
      );

      await EpicApp.createEpic(
        {
          ...basicInput,
          title: 'Epic 2',
        },
        []
      );

      // When
      const epicsConnection = await EpicApp.loadEpics({
        first: 10,
        orderBy: EpicOrdering.Title,
        orderMode: OrderingMode.Asc,
      });

      // Then
      expect(epicsConnection).toMatchObject({
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: true,
        },
      });
      const titles = epicsConnection.edges.map((e) => e.node.title);

      expect(titles).toHaveLength(2);
      expect(titles).toEqual(expect.arrayContaining(['Epic 1', 'Epic 2']));
    });

    it('should return empty connection when no epics exist', async () => {
      // Given
      // no epic created

      // When
      const epicsConnection = await EpicApp.loadEpics({
        first: 10,
        orderBy: EpicOrdering.Title,
        orderMode: OrderingMode.Asc,
      });

      // Then
      expect(epicsConnection).toMatchObject({
        pageInfo: expect.anything(),
      });
      expect(epicsConnection.edges).toHaveLength(0);
    });

    it('should return epics ordered in descending order when orderMode is Desc', async () => {
      // Given
      await EpicApp.createEpic(
        {
          ...basicInput,
          title: 'Epic A',
        },
        []
      );

      await EpicApp.createEpic(
        {
          ...basicInput,
          title: 'Epic B',
        },
        []
      );

      // When
      const epicsConnection = await EpicApp.loadEpics({
        first: 10,
        orderBy: EpicOrdering.Title,
        orderMode: OrderingMode.Desc,
      });

      // Then
      expect(epicsConnection.edges).toHaveLength(2);
      expect(epicsConnection.edges[0]?.node.title).toBe('Epic B');
      expect(epicsConnection.edges[1]?.node.title).toBe('Epic A');
    });

    it('should return only epics matching searchTerm on title', async () => {
      // Given
      await EpicApp.createEpic(
        {
          ...basicInput,
          title: 'Dashboard feature',
        },
        []
      );

      await EpicApp.createEpic(
        {
          ...basicInput,
          title: 'Connector improvement',
        },
        []
      );

      // When
      const epicsConnection = await EpicApp.loadEpics({
        first: 10,
        orderBy: EpicOrdering.Title,
        orderMode: OrderingMode.Asc,
        searchTerm: 'Dashboard',
      });

      // Then
      expect(epicsConnection.edges).toHaveLength(1);
      expect(epicsConnection.edges[0]?.node.title).toBe('Dashboard feature');
    });

    it('should return epics matching searchTerm on epic short_description', async () => {
      // Given
      await EpicApp.createEpic(
        {
          ...basicInput,
          title: 'Some title',
          short_description: 'Hello there',
        },
        []
      );

      await EpicApp.createEpic(
        {
          ...basicInput,
          title: 'Other title',
          short_description: 'Hi team',
        },
        []
      );

      // When
      const epicsConnection = await EpicApp.loadEpics({
        first: 10,
        orderBy: EpicOrdering.Title,
        orderMode: OrderingMode.Asc,
        searchTerm: 'Hi te',
      });

      // Then
      expect(epicsConnection.edges).toHaveLength(1);
      expect(epicsConnection.edges[0]?.node.title).toBe('Other title');
    });

    it('should return epics matching searchTerm on description', async () => {
      // Given
      await EpicApp.createEpic(
        {
          ...basicInput,
          title: 'Title A',
          description: 'threat intelligence',
        },
        []
      );

      await EpicApp.createEpic(
        {
          ...basicInput,
          title: 'Title B',
        },
        []
      );

      // When
      const epicsConnection = await EpicApp.loadEpics({
        first: 10,
        orderBy: EpicOrdering.Title,
        orderMode: OrderingMode.Asc,
        searchTerm: 'threat intellig',
      });

      // Then
      expect(epicsConnection.edges).toHaveLength(1);
      expect(epicsConnection.edges[0]?.node.title).toBe('Title A');
    });

    it('should return empty results when searchTerm matches nothing', async () => {
      // Given
      await EpicApp.createEpic(
        {
          ...basicInput,
          title: 'Some epic',
        },
        []
      );

      // When
      const epicsConnection = await EpicApp.loadEpics({
        first: 10,
        orderBy: EpicOrdering.Title,
        orderMode: OrderingMode.Asc,
        searchTerm: 'nonexistent',
      });

      // Then
      expect(epicsConnection.edges).toHaveLength(0);
    });
  });
});
