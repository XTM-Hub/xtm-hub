import { db } from '../../../../knexfile';
import {
  DocumentMetadataKeyCode,
  DocumentMetadata as DocumentMetadataResolverType,
  Document as DocumentResolverType,
  IntegrationType,
} from '../../../__generated__/resolvers-types';
import {
  DocumentId,
  default as DocumentModel,
} from '../../../model/kanel/public/Document';
import DocumentMetadata, {
  DocumentMetadataKey,
} from '../../../model/kanel/public/DocumentMetadata';
import { BOOLEAN_METADATA } from '../document.helper';
import { DocumentData } from './document.domain';

export type DocumentMetadataKeys<T extends DocumentModel> = Array<
  Exclude<
    keyof Omit<
      DocumentData<T>,
      | 'use_cases'
      | 'uploader_id'
      | 'uploader_organization_id'
      | 'remover_id'
      | 'mime_type'
      | 'source_type'
      | 'parent_document_id'
      | 'minio_name'
      | 'tags'
      | 'is_decommissioned'
      | 'version'
    >,
    keyof DocumentResolverType
  >
>;

export const DocumentMetadataDomain = {
  insertMetadataFromKeyValue: async (
    id: DocumentId,
    metadataInput: DocumentMetadataResolverType[]
  ): Promise<DocumentMetadata[]> => {
    if (!metadataInput.length) {
      return [];
    }

    const metadataToInsert: DocumentMetadata[] = metadataInput.map((meta) => ({
      document_id: id,
      key: meta.key as DocumentMetadataKey,
      value: meta.value,
    }));

    return db<DocumentMetadata>('Document_Metadata')
      .insert(metadataToInsert)
      .returning('*');
  },

  insertMetadata: async <T extends DocumentModel, TUseCase extends string>(
    id: DocumentId,
    data: DocumentData<T, TUseCase>,
    metadataKeys: DocumentMetadataKeys<T>
  ): Promise<DocumentMetadata[]> => {
    if (metadataKeys.length === 0) {
      return [];
    }

    const metadataToInsert = metadataKeys.map((key) => ({
      document_id: id,
      key: key as DocumentMetadataKey,
      value: data[key as keyof DocumentData<T, TUseCase>] as string,
    }));

    return db<DocumentMetadata>('Document_Metadata')
      .insert(metadataToInsert)
      .returning('*');
  },

  loadMetadataValueByKey: async (
    id: DocumentId,
    key: string
  ): Promise<string | null> => {
    const metadata: DocumentMetadata = await db<DocumentMetadata>(
      'Document_Metadata'
    )
      .where('document_id', id)
      .where('key', key)
      .select('value')
      .first();

    return metadata?.value ?? null;
  },

  loadMetadataByKeys: async (
    id: DocumentId,
    keys: readonly DocumentMetadataKeyCode[]
  ): Promise<DocumentMetadataResolverType[]> => {
    if (keys.length === 0) {
      return [];
    }
    const rows: Pick<DocumentMetadata, 'key' | 'value'>[] =
      await db<DocumentMetadata>('Document_Metadata')
        .where('document_id', id)
        .whereIn('key', keys)
        .select('key', 'value');
    return rows.flatMap(({ key, value }) =>
      value === null ? [] : [{ key: key as DocumentMetadataKeyCode, value }]
    );
  },

  loadProductVersion: async (id: DocumentId): Promise<string | null> => {
    const metadata: DocumentMetadata = await db<DocumentMetadata>(
      'Document_Metadata'
    )
      .where('document_id', id)
      .where('key', DocumentMetadataKeyCode.ProductVersion)
      .select('value')
      .first();

    return metadata?.value ?? null;
  },

  buildIntegrationTypeQuery: (documentIds: readonly string[]) => {
    return db<{ document_id: string; value: IntegrationType }>(
      'Document_Metadata'
    )
      .select('document_id', 'value')
      .whereIn('document_id', documentIds)
      .where('key', DocumentMetadataKeyCode.IntegrationType);
  },

  loadIntegrationType: async (
    document_id: string
  ): Promise<IntegrationType | null> => {
    const rows = await DocumentMetadataDomain.buildIntegrationTypeQuery([
      document_id,
    ]);
    return rows[0]?.value ?? null;
  },

  deleteMetadata: async ({
    id,
    excludedKeys = [],
  }: {
    id: DocumentId;
    excludedKeys?: string[];
  }) => {
    const qb = db<DocumentMetadata>('Document_Metadata').where(
      'document_id',
      id
    );

    excludedKeys.forEach((key) => {
      qb.whereNot('key', key);
    });

    await qb.delete();
  },

  /**
   * Projects metadata onto already-selected documents. Preferred way to expose
   * metadata: the pivot runs over the returned rows instead of every matching
   * document, keeping the main query lean.
   */
  hydrateMetadata: async <T extends { id: string }>(
    documents: T[],
    include_metadata: DocumentMetadataKeyCode[] = []
  ): Promise<T[]> => {
    if (!include_metadata.length || !documents.length) {
      return documents;
    }

    const rows = await db<DocumentMetadata[]>('Document_Metadata')
      .select('*')
      .whereIn(
        'document_id',
        documents.map(({ id }) => id)
      )
      .whereIn('key', include_metadata);

    const valuesByDocument = new Map<string, Map<string, string | null>>();
    for (const row of rows) {
      let values = valuesByDocument.get(row.document_id);
      if (!values) {
        values = new Map<string, string | null>();
        valuesByDocument.set(row.document_id, values);
      }
      values.set(row.key, row.value);
    }

    return documents.map((document) => {
      const values = valuesByDocument.get(document.id);
      const hydrated: Record<string, unknown> = { ...document };

      for (const metaKey of include_metadata) {
        const value = values?.get(metaKey) ?? null;
        const isBooleanMetadata = BOOLEAN_METADATA.includes(metaKey);
        hydrated[metaKey] = isBooleanMetadata ? value === 'true' : value;
      }

      return hydrated as T;
    });
  },

  /**
   * Single document variant of hydrateMetadata, for queries returning one row.
   */
  hydrateMetadataOne: async <T extends { id: string }>(
    document: T | undefined,
    include_metadata: DocumentMetadataKeyCode[] = []
  ): Promise<T | undefined> => {
    if (!document) {
      return document;
    }

    const [hydrated] = await DocumentMetadataDomain.hydrateMetadata(
      [document],
      include_metadata
    );

    return hydrated;
  },
};
