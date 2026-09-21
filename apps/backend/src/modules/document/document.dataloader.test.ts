import { toGlobalId } from 'graphql-relay/node/node.js';
import { describe, expect, it, vi } from 'vitest';
import { IntegrationType } from '../../__generated__/resolvers-types';
import User from '../../model/kanel/public/User';
import { UserDomain } from '../organization-management/user/user-domain/user.domain';
import { solutionCategoryDomain } from '../solution-category/solution-category.domain';
import { DocumentDataLoader } from './document.dataloader';
import { DocumentChildrenDomain } from './domain/document.children.domain';
import { DocumentDomain } from './domain/document.domain';
import { DocumentMetadataDomain } from './domain/document.metadata.domain';

describe('documentDataLoader', () => {
  it('should map documents by id and return null for missing ids', async () => {
    vi.spyOn(
      DocumentDomain,
      'loadDocumentsWithMetadataByIds'
    ).mockResolvedValue([{ id: 'doc-1' }] as never);

    const result = await DocumentDataLoader.batchLoadDocumentsById([
      'doc-1',
      'doc-2',
    ]);

    expect(DocumentDomain.loadDocumentsWithMetadataByIds).toHaveBeenCalledWith([
      'doc-1',
      'doc-2',
    ]);
    expect(result).toEqual([{ id: 'doc-1' }, null]);
  });

  it('should wire the document loader in create()', async () => {
    const batchLoadDocumentsByIdSpy = vi
      .spyOn(DocumentDataLoader, 'batchLoadDocumentsById')
      .mockResolvedValue([{ id: 'doc-1' } as never]);

    const loaders = DocumentDataLoader.create();
    const result = await loaders.documentByIdLoader.load('doc-1');

    expect(batchLoadDocumentsByIdSpy).toHaveBeenCalledWith(['doc-1']);
    expect(result).toEqual({ id: 'doc-1' });
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
      {
        id: 'cat-1',
        name: 'Threat Intelligence',
        _document_id: 'doc-1',
      },
      {
        id: 'cat-2',
        name: 'Network Security',
        _document_id: 'doc-1',
      },
    ] as never);

    const result =
      await DocumentDataLoader.batchLoadSolutionCategoriesByDocumentId([
        'doc-1',
        'doc-2',
      ]);

    expect(result).toEqual([
      [
        { id: 'cat-1', name: 'Threat Intelligence', _document_id: 'doc-1' },
        { id: 'cat-2', name: 'Network Security', _document_id: 'doc-1' },
      ],
      [],
    ]);
  });

  it('should convert image ids to global ids and keep grouping by parent id', async () => {
    vi.spyOn(DocumentChildrenDomain, 'loadImagesByParentIds').mockResolvedValue(
      [
        {
          id: 'image-1',
          _parent_id: 'doc-1',
        },
        {
          id: 'image-2',
          _parent_id: 'doc-2',
        },
      ] as never
    );

    const result = await DocumentDataLoader.batchLoadImagesByDocumentId([
      'doc-1',
      'doc-2',
    ]);

    expect(result).toEqual([
      [{ id: toGlobalId('Document', 'image-1'), _parent_id: 'doc-1' }],
      [{ id: toGlobalId('Document', 'image-2'), _parent_id: 'doc-2' }],
    ]);
  });

  it('should group children documents by parent id', async () => {
    vi.spyOn(
      DocumentChildrenDomain,
      'loadChildrenDocumentsByParentIds'
    ).mockResolvedValue([
      {
        id: 'child-1',
        _parent_id: 'doc-1',
      },
      {
        id: 'child-2',
        _parent_id: 'doc-1',
      },
      {
        id: 'child-3',
        _parent_id: 'doc-2',
      },
    ] as never);

    const result = await DocumentDataLoader.batchLoadChildrenDocuments([
      'doc-1',
      'doc-2',
      'doc-3',
    ]);

    expect(result).toEqual([
      [
        { id: 'child-1', _parent_id: 'doc-1' },
        { id: 'child-2', _parent_id: 'doc-1' },
      ],
      [{ id: 'child-3', _parent_id: 'doc-2' }],
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
