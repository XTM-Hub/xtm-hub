import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../../../knexfile';
import { TestHelper } from '../../../../tests/helper/test.helper';
import { SERVICES } from '../../../../tests/tests.const';
import {
  DocumentImageType,
  DocumentSourceType,
} from '../../../__generated__/resolvers-types';
import Document, { DocumentId } from '../../../model/kanel/public/Document';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import { ADMIN_UUID } from '../../../portal.const';
import { DOCUMENT_IMAGE_METADATA_KEYS } from '../document.model';
import { DocumentChildrenDomain } from './document.children.domain';

async function insertDocument({
  id,
  type = 'image',
  source_type = DocumentSourceType.External,
  minio_name = 'minio-file',
  mime_type = 'image/png',
  service_instance_id = null,
  ...rest
}: Partial<Document> & { id?: DocumentId } = {}): Promise<DocumentId> {
  const realId = id ?? (uuidv4() as DocumentId);
  await TestHelper.document.create({
    id: realId,
    type,
    source_type,
    minio_name,
    mime_type,
    service_instance_id,
    name: 'Test Image',
    uploader_id: ADMIN_UUID,
    ...rest,
  });
  return realId;
}

describe('documentChildrenDomain', () => {
  let parentId: DocumentId;
  let childId1: DocumentId;
  let childId2: DocumentId;
  let unrelatedChildId: DocumentId;
  const serviceInstanceId: ServiceInstanceId =
    SERVICES.INSTANCES.INTEGRATIONS.ID;

  beforeEach(async () => {
    await TestHelper.documentChildren.delete({});
    await TestHelper.document.delete({});
    parentId = uuidv4() as DocumentId;
    childId1 = await insertDocument({});
    childId2 = await insertDocument({ minio_name: 'minio-file-2' });
    unrelatedChildId = await insertDocument({
      type: 'image',
      source_type: DocumentSourceType.Internal,
      minio_name: 'not-external',
    });
    // Insert parent document (not deleted by the tested method)
    await insertDocument({
      id: parentId,
      type: 'folder',
      source_type: DocumentSourceType.Internal,
      minio_name: 'parent-folder',
      service_instance_id: serviceInstanceId,
    });
  });

  afterEach(async () => {
    await TestHelper.documentChildren.delete({});
    await TestHelper.document.delete({});
  });

  describe('deleteExternalImages', () => {
    beforeEach(async () => {
      // Link children to parent
      await TestHelper.documentChildren.create({
        parent_document_id: parentId,
        child_document_id: childId1,
      });
      await TestHelper.documentChildren.create({
        parent_document_id: parentId,
        child_document_id: childId2,
      });
      await TestHelper.documentChildren.create({
        parent_document_id: parentId,
        child_document_id: unrelatedChildId,
      });
    });

    it('should delete only external image children and return their ids and minio_names', async () => {
      const deleted =
        await DocumentChildrenDomain.deleteExternalImages(parentId);
      expect(Array.isArray(deleted)).toBe(true);
      expect(deleted).toHaveLength(2);
      const deletedIds = deleted.map((d) => d.id);
      expect(deletedIds).toContain(childId1);
      expect(deletedIds).toContain(childId2);
      expect(deleted.find((d) => d.minio_name === 'minio-file')).toBeTruthy();
      expect(deleted.find((d) => d.minio_name === 'minio-file-2')).toBeTruthy();

      // Check DB: only unrelated child remains
      const remaining = await TestHelper.document.loadAll({});
      expect(remaining).toHaveLength(2); // parent + unrelated child
      const remainingIds = remaining!.map(({ id }) => id);
      expect(remainingIds).toContain(parentId);
      expect(remainingIds).toContain(unrelatedChildId);
    });

    it('should not delete anything if no external image children', async () => {
      // Remove external type from children
      // eslint-disable-next-line no-restricted-syntax
      await db<Document>('Document')
        .whereIn('id', [childId1, childId2])
        .update({ source_type: DocumentSourceType.Internal });
      const deleted =
        await DocumentChildrenDomain.deleteExternalImages(parentId);
      expect(deleted).toEqual([]);
      // All children remain
      const remaining = await TestHelper.document.loadAll({});
      expect(remaining).toHaveLength(4); // parent + 3 children
    });

    it('should not delete children of other parents', async () => {
      const otherParentId = uuidv4() as DocumentId;
      await insertDocument({
        id: otherParentId,
      });
      const otherChildId = await insertDocument({
        minio_name: 'other-minio',
        source_type: DocumentSourceType.External,
      });
      await TestHelper.documentChildren.create({
        parent_document_id: otherParentId,
        child_document_id: otherChildId,
      });

      const deleted =
        await DocumentChildrenDomain.deleteExternalImages(parentId);
      expect(deleted).toHaveLength(2);
      // The other child should still exist
      const exists = await TestHelper.document.load({
        id: otherChildId,
      });
      expect(exists).toBeTruthy();
    });
  });

  describe('createImageDocuments', () => {
    let parentId: DocumentId;
    let serviceInstanceId: ServiceInstanceId;
    beforeEach(async () => {
      await TestHelper.documentChildren.delete({});
      await TestHelper.document.delete({});
      parentId = await insertDocument({
        type: 'folder',
        source_type: DocumentSourceType.Internal,
      });
      serviceInstanceId = SERVICES.INSTANCES.INTEGRATIONS.ID;
    });

    it('should create a single image document with correct parent and metadata', async () => {
      const file = {
        fileName: 'img1.png',
        minioName: 'minio-img1',
        mimeType: 'image/png',
      };
      await DocumentChildrenDomain.createImageDocuments(
        parentId,
        serviceInstanceId,
        [file],
        DocumentImageType.Image,
        DocumentSourceType.External
      );
      const children = await DocumentChildrenDomain.loadChildrenDocuments(
        parentId,
        DOCUMENT_IMAGE_METADATA_KEYS
      );
      expect(children).toHaveLength(1);
      expect(children[0]).toMatchObject({
        file_name: 'img1.png',
        minio_name: 'minio-img1',
        mime_type: 'image/png',
        source_type: DocumentSourceType.External,
        image_type: DocumentImageType.Image,
        service_instance_id: serviceInstanceId,
      });
    });

    it('should create multiple image documents if multiple files are provided', async () => {
      const files = [
        {
          fileName: 'img1.png',
          minioName: 'minio-img1',
          mimeType: 'image/png',
        },
        {
          fileName: 'img2.jpg',
          minioName: 'minio-img2',
          mimeType: 'image/jpeg',
        },
      ];
      await DocumentChildrenDomain.createImageDocuments(
        parentId,
        serviceInstanceId,
        files,
        DocumentImageType.Image,
        DocumentSourceType.Internal
      );
      // eslint-disable-next-line no-restricted-syntax
      const children = await db<Document>('Document')
        .leftJoin(
          'Document_Children',
          'Document.id',
          'Document_Children.child_document_id'
        )
        .where('Document_Children.parent_document_id', parentId)
        .select('Document.*');
      expect(children).toHaveLength(2);
      const fileNames = children.map((c: Document) => c.file_name);
      expect(fileNames).toContain('img1.png');
      expect(fileNames).toContain('img2.jpg');
      children.forEach((c: Document) =>
        expect(c.source_type).toBe(DocumentSourceType.Internal)
      );
    });

    it('should do nothing if files array is empty', async () => {
      await DocumentChildrenDomain.createImageDocuments(
        parentId,
        serviceInstanceId,
        [],
        DocumentImageType.Logo,
        DocumentSourceType.External
      );
      // eslint-disable-next-line no-restricted-syntax
      const children = await db<Document>('Document')
        .leftJoin(
          'Document_Children',
          'Document.id',
          'Document_Children.child_document_id'
        )
        .where('Document_Children.parent_document_id', parentId)
        .select('Document.*');
      expect(children).toHaveLength(0);
    });

    it('should default to internal source_type if not specified', async () => {
      const file = {
        fileName: 'img1.png',
        minioName: 'minio-img1',
        mimeType: 'image/png',
      };
      await DocumentChildrenDomain.createImageDocuments(
        parentId,
        serviceInstanceId,
        [file],
        DocumentImageType.Image
      );
      const children = await DocumentChildrenDomain.loadChildrenDocuments(
        parentId,
        DOCUMENT_IMAGE_METADATA_KEYS
      );
      expect(children).toHaveLength(1);
      expect(children[0]!.source_type).toBe(DocumentSourceType.Internal);
    });
  });
});
