import { toGlobalId } from 'graphql-relay/node/node.js';
import { db } from '../../../../knexfile';
import {
  DocumentImageType,
  DocumentMetadataKeyCode,
  DocumentSourceType,
} from '../../../__generated__/resolvers-types';
import { withTransaction } from '../../../context/database.context';
import { requestContext } from '../../../context/request.context';
import {
  DocumentId,
  default as DocumentModel,
} from '../../../model/kanel/public/Document';
import DocumentChildren from '../../../model/kanel/public/DocumentChildren';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import { restrictDocumentToUserOrganization } from '../../../security/restriction/document';
import { MinioFile } from '../../../thirdparty/minio/types';
import { ErrorCode } from '../../../utils/error/error.code';
import { DocumentApp } from '../document.app';
import { Document } from '../document.helper';
import { DOCUMENT_IMAGE_METADATA_KEYS, DocumentImage } from '../document.model';
import { DocumentUploadsHelper, Upload } from '../document.uploads.helper';
import {
  DocumentMetadataDomain,
  DocumentMetadataKeys,
} from './document.metadata.domain';

export type ExternalImageFile = Pick<DocumentModel, 'id' | 'minio_name'>;

const toMinioNames = (images: ExternalImageFile[]): string[] =>
  images.flatMap(({ minio_name }) => (minio_name ? [minio_name] : []));

export const DocumentChildrenDomain = {
  insertChildRelationship: async ({
    childDocumentId,
    parentDocumentId,
  }: {
    childDocumentId: DocumentId;
    parentDocumentId: DocumentId;
  }) => {
    await db<DocumentChildren>('Document_Children').insert({
      parent_document_id: parentDocumentId,
      child_document_id: childDocumentId,
    });
  },

  loadChildrenIds: async (
    parentDocumentId: DocumentId,
    excludeChildrenIds: DocumentId[] = []
  ): Promise<DocumentId[]> => {
    const qb = db<DocumentChildren>('Document_Children')
      .where('parent_document_id', '=', parentDocumentId)
      .select('child_document_id');

    if (excludeChildrenIds.length) {
      qb.whereNotIn('child_document_id', excludeChildrenIds);
    }

    const children: Pick<DocumentChildren, 'child_document_id'>[] = await qb;
    return children.map(({ child_document_id }) => child_document_id);
  },

  loadChildrenDocumentsByParentIds: async <T extends { id: string } = Document>(
    parentIds: readonly string[],
    options: {
      isDataLoader?: boolean;
      includeMetadata?: DocumentMetadataKeyCode[];
    } = {}
  ): Promise<T[]> => {
    const { isDataLoader = false, includeMetadata = [] } = options;
    const context = requestContext.get();
    const query = db<T>('Document_Children')
      .leftJoin(
        'Document',
        'Document.id',
        'Document_Children.child_document_id'
      )
      .whereIn('Document_Children.parent_document_id', parentIds)
      .modify((qb) => {
        if (context?.user) {
          restrictDocumentToUserOrganization(qb);
        }
      })
      .orderBy('created_at', 'asc')
      .groupBy('Document.id');

    if (isDataLoader) {
      query
        .select(
          'Document.*',
          'Document_Children.parent_document_id as _parent_id'
        )
        .groupBy('Document_Children.parent_document_id');
    } else {
      query.select('Document.*');
    }

    const documents: T[] = await query;

    return DocumentMetadataDomain.hydrateMetadata(documents, includeMetadata);
  },

  loadChildrenDocuments: async (
    documentId: string,
    include_metadata: DocumentMetadataKeyCode[] = []
  ): Promise<Document[]> => {
    return DocumentChildrenDomain.loadChildrenDocumentsByParentIds(
      [documentId],
      {
        includeMetadata: include_metadata,
      }
    );
  },

  deleteChildrenByParent: async (parentDocumentId: DocumentId) => {
    await db<DocumentChildren>('Document_Children')
      .where('parent_document_id', '=', parentDocumentId)
      .delete('Document_Children.*');
  },

  deleteChild: async (childDocumentId: DocumentId) => {
    await db<DocumentChildren>('Document_Children')
      .where({ child_document_id: childDocumentId })
      .delete();
  },

  createImageDocuments: async (
    parentDocumentId: DocumentId,
    serviceInstanceId: ServiceInstanceId,
    files: MinioFile[],
    imageType: DocumentImageType,
    sourceType: DocumentSourceType = DocumentSourceType.Internal
  ) => {
    await Promise.all(
      files.map((file) =>
        DocumentApp.createDocumentWithChildrenAndMetadata<DocumentImage>(
          {
            type: 'image',
            parent_document_id: parentDocumentId,
            file_name: file.fileName,
            minio_name: file.minioName,
            mime_type: file.mimeType,
            service_instance_id: serviceInstanceId,
            source_type: sourceType,
            image_type: imageType,
          },
          DOCUMENT_IMAGE_METADATA_KEYS as DocumentMetadataKeys<DocumentImage>
        )
      )
    );
  },

  loadImagesByParentIds: async <T extends { id: string } = Document>(
    parentIds: readonly string[],
    options: { isDataLoader?: boolean } = {}
  ): Promise<T[]> => {
    const { isDataLoader = false } = options;
    const query = db<T>('Document')
      .join(
        'Document_Children',
        'Document.id',
        '=',
        'Document_Children.child_document_id'
      )
      .whereIn('Document_Children.parent_document_id', parentIds)
      .where('Document.mime_type', 'like', 'image/%')
      .groupBy('Document.id');

    if (isDataLoader) {
      query
        .select(
          'Document.*',
          'Document_Children.parent_document_id as _parent_id'
        )
        .groupBy('Document_Children.parent_document_id');
    } else {
      query.select('Document.*');
    }

    const images: T[] = await query;

    return DocumentMetadataDomain.hydrateMetadata(
      images,
      DOCUMENT_IMAGE_METADATA_KEYS
    );
  },

  loadImagesByDocumentId: async (documentId: string) => {
    const images = await DocumentChildrenDomain.loadImagesByParentIds([
      documentId,
    ]);

    for (const image of images) {
      image.id = toGlobalId('Document', image.id) as typeof image.id;
    }
    return images;
  },

  /**
   * Replaces the external image of `doc` and returns the storage names of the
   * files it made obsolete. It does not delete them: the caller must do so
   * once its outermost transaction is committed, so a rollback keeps them.
   */
  upsertExternalImage: async <T extends DocumentModel>(
    doc: T,
    externalImageUpload: Upload
  ): Promise<string[]> => {
    const { service_instance_id } = doc;
    if (!service_instance_id) {
      throw new Error(ErrorCode.ServiceInstanceNotFound);
    }

    const [logoFile] = await DocumentUploadsHelper.processUploads(
      externalImageUpload,
      service_instance_id
    );

    const obsoleteMinioNames = await withTransaction(async () => {
      if (!logoFile) {
        const deleted = await DocumentChildrenDomain.deleteExternalImages(
          doc.id
        );
        return toMinioNames(deleted);
      }

      // Keep the id of the existing external image: its URL is public, indexed
      // by search engines and shared in link previews, so it must stay valid.
      const [existingImage] =
        await DocumentChildrenDomain.loadExternalImageFiles(doc.id);
      if (!existingImage) {
        await DocumentChildrenDomain.createImageDocuments(
          doc.id,
          service_instance_id,
          [logoFile],
          DocumentImageType.Logo,
          DocumentSourceType.External
        );
        return [];
      }

      await DocumentChildrenDomain.replaceImageFile(existingImage.id, logoFile);
      const deletedDuplicates =
        await DocumentChildrenDomain.deleteExternalImages(
          doc.id,
          existingImage.id
        );
      // The retained image now references the new file: never delete it, even
      // if the replaced image or a duplicate pointed to the same object.
      return toMinioNames([existingImage, ...deletedDuplicates]).filter(
        (minioName) => minioName !== logoFile.minioName
      );
    });

    return [...new Set(obsoleteMinioNames)];
  },

  loadExternalImageFiles: async (
    parentDocumentId: DocumentId
  ): Promise<ExternalImageFile[]> => {
    return db<DocumentModel>('Document')
      .join(
        'Document_Children',
        'Document.id',
        'Document_Children.child_document_id'
      )
      .where('Document_Children.parent_document_id', parentDocumentId)
      .andWhere('Document.type', '=', 'image')
      .andWhere('Document.source_type', '=', DocumentSourceType.External)
      .orderBy([
        { column: 'Document.created_at', order: 'asc' },
        { column: 'Document.id', order: 'asc' },
      ])
      .select('Document.id', 'Document.minio_name');
  },

  replaceImageFile: async (imageDocumentId: DocumentId, file: MinioFile) => {
    await db<DocumentModel>('Document')
      .where('id', '=', imageDocumentId)
      .update({
        file_name: file.fileName,
        minio_name: file.minioName,
        mime_type: file.mimeType,
        updated_at: new Date(),
      });
  },

  deleteExternalImages: async (
    parentDocumentId: DocumentId,
    excludeDocumentId?: DocumentId
  ): Promise<ExternalImageFile[]> => {
    return db<DocumentModel>('Document')
      .delete()
      .whereIn('id', function () {
        this.select('child_document_id')
          .from('Document_Children')
          .where('parent_document_id', parentDocumentId);
      })
      .andWhere('Document.type', '=', 'image')
      .andWhere('Document.source_type', '=', DocumentSourceType.External)
      .modify((qb) => {
        if (excludeDocumentId) {
          qb.andWhereNot('Document.id', excludeDocumentId);
        }
      })
      .returning(['id', 'minio_name']);
  },
};
