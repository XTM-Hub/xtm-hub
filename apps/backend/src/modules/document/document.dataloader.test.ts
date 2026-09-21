import { toGlobalId } from 'graphql-relay/node/node.js';
import { describe, expect, it, vi } from 'vitest';
import {
  FiligranProduct,
  IntegrationType,
} from '../../__generated__/resolvers-types';
import { DocumentId } from '../../model/kanel/public/Document';
import SolutionCategory, {
  SolutionCategoryId,
} from '../../model/kanel/public/SolutionCategory';
import User from '../../model/kanel/public/User';
import { UserDomain } from '../organization-management/user/user-domain/user.domain';
import { solutionCategoryDomain } from '../solution-category/solution-category.domain';
import { DocumentDataLoader } from './document.dataloader';
import { Document, WithDocumentId, WithParentId } from './document.helper';
import { DocumentChildrenDomain } from './domain/document.children.domain';
import { DocumentDomain } from './domain/document.domain';
import { DocumentMetadataDomain } from './domain/document.metadata.domain';

const buildDocument = (overrides: Partial<Document> = {}): Document => ({
  id: 'doc-1' as DocumentId,
  uploader_id: null,
  service_instance_id: null,
  description: null,
  file_name: null,
  minio_name: null,
  active: true,
  created_at: new Date('2024-01-01T00:00:00Z'),
  remover_id: null,
  mime_type: null,
  name: null,
  updated_at: null,
  updater_id: null,
  short_description: null,
  slug: null,
  uploader_organization_id: null,
  type: 'test-type',
  source_type: null,
  is_decommissioned: false,
  version: null,
  tags: [],
  use_cases: [],
  ...overrides,
});

const buildChildDocument = (
  overrides: Partial<WithParentId<Document>> = {}
): WithParentId<Document> => ({
  ...buildDocument(),
  _parent_id: 'doc-1',
  ...overrides,
});

const buildSolutionCategory = (
  overrides: Partial<WithDocumentId<SolutionCategory>> = {}
): WithDocumentId<SolutionCategory> => ({
  id: 'cat-1' as SolutionCategoryId,
  name: 'Threat Intelligence',
  product: [FiligranProduct.Opencti],
  _document_id: 'doc-1',
  ...overrides,
});

describe('documentDataLoader', () => {
  it('should map documents by id and return null for missing ids', async () => {
    vi.spyOn(
      DocumentDomain,
      'loadDocumentsWithMetadataByIds'
    ).mockResolvedValue([buildDocument({ id: 'doc-1' as DocumentId })]);

    const result = await DocumentDataLoader.batchLoadDocumentsById([
      'doc-1',
      'doc-2',
    ]);

    expect(DocumentDomain.loadDocumentsWithMetadataByIds).toHaveBeenCalledWith([
      'doc-1',
      'doc-2',
    ]);
    expect(result).toEqual([
      buildDocument({ id: 'doc-1' as DocumentId }),
      null,
    ]);
  });

  it('should wire the document loader in create()', async () => {
    const batchLoadDocumentsByIdSpy = vi
      .spyOn(DocumentDataLoader, 'batchLoadDocumentsById')
      .mockResolvedValue([buildDocument({ id: 'doc-1' as DocumentId })]);

    const loaders = DocumentDataLoader.create();
    const result = await loaders.documentByIdLoader.load('doc-1');

    expect(batchLoadDocumentsByIdSpy).toHaveBeenCalledWith(['doc-1']);
    expect(result).toEqual(buildDocument({ id: 'doc-1' as DocumentId }));
  });

  it('should map users by id and return null for missing users', async () => {
    vi.spyOn(UserDomain, 'loadUsers').mockResolvedValue([
      { id: 'user-1' } as User,
    ]);

    const result = await DocumentDataLoader.batchLoadUsers([
      'user-1',
      'user-2',
    ]);

    expect(result).toEqual([{ id: 'user-1' }, null]);
  });

  it('should map solution categories by document id and return an empty array when missing', async () => {
    vi.spyOn(
      solutionCategoryDomain,
      'buildSolutionCategoriesByDocumentIdQuery'
    ).mockResolvedValue([
      buildSolutionCategory({
        id: 'cat-1' as SolutionCategoryId,
        name: 'Threat Intelligence',
        _document_id: 'doc-1',
      }),
      buildSolutionCategory({
        id: 'cat-2' as SolutionCategoryId,
        name: 'Network Security',
        _document_id: 'doc-1',
      }),
    ]);

    const result =
      await DocumentDataLoader.batchLoadSolutionCategoriesByDocumentId([
        'doc-1',
        'doc-2',
      ]);

    expect(result).toEqual([
      [
        buildSolutionCategory({
          id: 'cat-1' as SolutionCategoryId,
          name: 'Threat Intelligence',
          _document_id: 'doc-1',
        }),
        buildSolutionCategory({
          id: 'cat-2' as SolutionCategoryId,
          name: 'Network Security',
          _document_id: 'doc-1',
        }),
      ],
      [],
    ]);
  });

  it('should convert image ids to global ids and keep grouping by parent id', async () => {
    vi.spyOn(DocumentChildrenDomain, 'loadImagesByParentIds').mockResolvedValue(
      [
        buildChildDocument({
          id: 'image-1' as DocumentId,
          _parent_id: 'doc-1',
        }),
        buildChildDocument({
          id: 'image-2' as DocumentId,
          _parent_id: 'doc-2',
        }),
      ]
    );

    const result = await DocumentDataLoader.batchLoadImagesByDocumentId([
      'doc-1',
      'doc-2',
    ]);

    expect(result).toEqual([
      [
        buildChildDocument({
          id: toGlobalId('Document', 'image-1') as DocumentId,
          _parent_id: 'doc-1',
        }),
      ],
      [
        buildChildDocument({
          id: toGlobalId('Document', 'image-2') as DocumentId,
          _parent_id: 'doc-2',
        }),
      ],
    ]);
  });

  it('should group children documents by parent id', async () => {
    vi.spyOn(
      DocumentChildrenDomain,
      'loadChildrenDocumentsByParentIds'
    ).mockResolvedValue([
      buildChildDocument({ id: 'child-1' as DocumentId, _parent_id: 'doc-1' }),
      buildChildDocument({ id: 'child-2' as DocumentId, _parent_id: 'doc-1' }),
      buildChildDocument({ id: 'child-3' as DocumentId, _parent_id: 'doc-2' }),
    ]);

    const result = await DocumentDataLoader.batchLoadChildrenDocuments([
      'doc-1',
      'doc-2',
      'doc-3',
    ]);

    expect(result).toEqual([
      [
        buildChildDocument({
          id: 'child-1' as DocumentId,
          _parent_id: 'doc-1',
        }),
        buildChildDocument({
          id: 'child-2' as DocumentId,
          _parent_id: 'doc-1',
        }),
      ],
      [
        buildChildDocument({
          id: 'child-3' as DocumentId,
          _parent_id: 'doc-2',
        }),
      ],
      [],
    ]);
  });

  it('should map integration types by document id and return null when missing', async () => {
    vi.spyOn(
      DocumentMetadataDomain,
      'buildIntegrationTypeQuery'
    ).mockResolvedValue([
      {
        document_id: 'doc-1',
        value: IntegrationType.CsvFeed,
      },
    ]);

    const result = await DocumentDataLoader.batchLoadIntegrationTypes([
      'doc-1',
      'doc-2',
    ]);

    expect(result).toEqual([IntegrationType.CsvFeed, null]);
  });

  it('should wire user loader in create()', async () => {
    const batchLoadUsersSpy = vi
      .spyOn(DocumentDataLoader, 'batchLoadUsers')
      .mockResolvedValue([{ id: 'user-1' } as User]);

    const loaders = DocumentDataLoader.create();
    const result = await loaders.userLoader.load('user-1');

    expect(batchLoadUsersSpy).toHaveBeenCalledWith(['user-1']);
    expect(result).toEqual({ id: 'user-1' });
  });
});
