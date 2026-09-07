import { v4 as uuidv4 } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import {
  contextSimpleUserFiligran2,
  GRAPHQL_RESOLVE_INFO,
} from '../../../tests/tests.const';
import {
  CreateEpicInput,
  EpicConnection,
  EpicEdge,
  EpicOrdering,
  EpicType,
  FiligranProduct,
  OrderingMode,
  PageInfo,
  Timeline,
  UpdateEpicInput,
} from '../../__generated__/resolvers-types';
import { DocumentId } from '../../model/kanel/public/Document';
import Epic, { EpicId } from '../../model/kanel/public/Epic';
import { BadRequestErrorCode } from '../../utils/error/error.code';
import { ErrorType } from '../../utils/error/error.type';
import { DocumentDomain } from '../document/domain/document.domain';
import { EpicApp } from './epic.app';
import epicResolver from './epic.resolver';

describe('epic.document', () => {
  it('should load document by document_id', async () => {
    // Given
    const documentId = uuidv4() as DocumentId;
    const epicParent = {
      id: uuidv4() as EpicId,
      document_id: documentId,
    } as unknown as Epic;
    const expectedDocument = { id: documentId, file_name: 'image.png' };
    vi.spyOn(DocumentDomain, 'loadDocumentBy').mockResolvedValue(
      expectedDocument as unknown as Awaited<
        ReturnType<typeof DocumentDomain.loadDocumentBy>
      >
    );

    // When
    const result = await epicResolver.Epic!.document!(
      epicParent,
      {},
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(DocumentDomain.loadDocumentBy).toHaveBeenCalledWith({
      id: documentId,
    });
    expect(result).toMatchObject({ id: documentId, file_name: 'image.png' });
  });

  it('should return null when document_id is not set', async () => {
    // Given
    const epicParent = {
      id: uuidv4() as EpicId,
      document_id: null,
    } as unknown as Epic;

    // When
    const result = await epicResolver.Epic!.document!(
      epicParent,
      {},
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(result).toBeNull();
  });

  it('should return null when DocumentDomain returns undefined', async () => {
    // Given
    const documentId = uuidv4() as DocumentId;
    const epicParent = {
      id: uuidv4() as EpicId,
      document_id: documentId,
    } as unknown as Epic;
    vi.spyOn(DocumentDomain, 'loadDocumentBy').mockResolvedValue(undefined);

    // When
    const result = await epicResolver.Epic!.document!(
      epicParent,
      {},
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(result).toBeNull();
  });
});

describe('epics GraphQL query', () => {
  it('should delegate to EpicApp.loadEpics and return result', async () => {
    // Given
    const opts = {
      first: 10,
      orderBy: EpicOrdering.Title,
      orderMode: OrderingMode.Asc,
    };
    const epicId = uuidv4() as EpicId;
    const epic: Epic = {
      id: epicId,
      epic: 'my-epic',
      title: 'My Epic',
      active: true,
      short_description: 'A short description',
      description: 'A longer description',
      product: [FiligranProduct.Opencti],
      timeline: Timeline.Now,
      epic_type: EpicType.Other,
      uploader_id: 'uploader-1',
      document_id: null,
      created_at: new Date('2026-01-01'),
      updated_at: null,
      updater_id: null,
    };
    const edge: EpicEdge = {
      cursor: epicId,
      node: epic as unknown as EpicEdge['node'],
    };
    const pageInfo: PageInfo = {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: epicId,
      endCursor: epicId,
    };
    const expected: EpicConnection = {
      edges: [edge],
      pageInfo,
      totalCount: 1,
    };
    vi.spyOn(EpicApp, 'loadEpics').mockResolvedValue(expected);

    // When
    const result = await epicResolver.Query!.epics!(
      {},
      opts,
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(EpicApp.loadEpics).toHaveBeenCalledWith(opts);
    expect(result).toEqual(expected);
  });
});

describe('create epic GraphQL mutation', () => {
  it('should delegate to EpicApp.createEpic and return created epic', async () => {
    // Given
    const input: CreateEpicInput = {
      title: 'My Epic',
      short_description: 'A short description',
      description: 'A longer description',
      product: [FiligranProduct.Opencti],
      timeline: Timeline.Now,
    };
    const uploads: never[] = [];
    const expected = {
      id: uuidv4() as EpicId,
      title: 'My Epic',
      epic_type: EpicType.Other,
    } as Epic;
    vi.spyOn(EpicApp, 'createEpic').mockResolvedValue(expected);

    // When
    const result = await epicResolver.Mutation!.createEpic!(
      {},
      { input, document: uploads },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(EpicApp.createEpic).toHaveBeenCalledWith(input, uploads);
    expect(result).toMatchObject({ title: 'My Epic' });
  });

  it('should map to BadRequest for InvalidImageUrl error', async () => {
    // Given
    const input: CreateEpicInput = {
      title: 'My Epic',
      short_description: 'Short',
      description: 'Long',
      product: [FiligranProduct.Opencti],
      timeline: Timeline.Now,
    };
    vi.spyOn(EpicApp, 'createEpic').mockRejectedValue(
      new Error(BadRequestErrorCode.InvalidImageUrl)
    );

    // When
    const call = epicResolver.Mutation!.createEpic!(
      {},
      { input, document: [] },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    await expect(call).rejects.toMatchObject({ name: ErrorType.BadRequest });
  });
});

describe('update epic GraphQL mutation', () => {
  it('should delegate to EpicApp.updateEpic with typed id and return updated epic', async () => {
    // Given
    const id = uuidv4() as EpicId;
    const input: UpdateEpicInput = {
      title: 'Updated Epic',
      short_description: 'Updated',
    };
    const uploads: never[] = [];
    const expected = { id, title: 'Updated Epic' } as Epic;
    vi.spyOn(EpicApp, 'updateEpic').mockResolvedValue(expected);

    // When
    const result = await epicResolver.Mutation!.updateEpic!(
      {},
      { id, input, document: uploads },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(EpicApp.updateEpic).toHaveBeenCalledWith(id, input, uploads);
    expect(result).toMatchObject({ title: 'Updated Epic' });
  });

  it('should map to BadRequest for InvalidImageUrl error', async () => {
    // Given
    const id = uuidv4() as EpicId;
    vi.spyOn(EpicApp, 'updateEpic').mockRejectedValue(
      new Error(BadRequestErrorCode.InvalidImageUrl)
    );

    // When
    const call = epicResolver.Mutation!.updateEpic!(
      {},
      {
        id,
        input: { title: 'Updated', short_description: 'Updated' },
        document: [],
      },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    await expect(call).rejects.toMatchObject({ name: ErrorType.BadRequest });
  });
});

describe('delete epic GraphQL mutation', () => {
  it('should delegate to EpicApp.deleteEpic with typed id and return deleted epic', async () => {
    // Given
    const id = uuidv4() as EpicId;
    const expected = { id, title: 'Deleted Epic' } as Epic;
    vi.spyOn(EpicApp, 'deleteEpic').mockResolvedValue(expected);

    // When
    const result = await epicResolver.Mutation!.deleteEpic!(
      {},
      { id },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(EpicApp.deleteEpic).toHaveBeenCalledWith(id);
    expect(result).toMatchObject({ id });
  });

  it('should map to BadRequest for InvalidImageUrl error', async () => {
    // Given
    const id = uuidv4() as EpicId;
    vi.spyOn(EpicApp, 'deleteEpic').mockRejectedValue(
      new Error(BadRequestErrorCode.InvalidImageUrl)
    );

    // When
    const call = epicResolver.Mutation!.deleteEpic!(
      {},
      { id },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    await expect(call).rejects.toMatchObject({ name: ErrorType.BadRequest });
  });
});
