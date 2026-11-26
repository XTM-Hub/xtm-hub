import { v4 as uuidv4 } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import {
  // eslint-disable-next-line no-restricted-imports
  contextBypassUser,
  contextSimpleUserFiligran2,
  GRAPHQL_RESOLVE_INFO,
} from '../../../tests/tests.const';
import {
  AddSolutionCategoryInput,
  FiligranProduct,
  OrderingMode,
  PageInfo,
  SolutionCategoryConnection,
  SolutionCategoryEdge,
  SolutionCategoryOrdering,
} from '../../__generated__/resolvers-types';
import SolutionCategory, {
  SolutionCategoryId,
} from '../../model/kanel/public/SolutionCategory';
import { solutionCategoryApp } from './solution-category.app';
import { solutionCategoryDomain } from './solution-category.domain';
import solutionCategoryResolver from './solution-category.resolver';

describe('solution categories GraphQL query', () => {
  it('should delegate to solutionCategoryDomain.loadSolutionCategories and return result', async () => {
    // Given
    const opts = {
      first: 10,
      orderBy: SolutionCategoryOrdering.Name,
      orderMode: OrderingMode.Asc,
      product: FiligranProduct.Opencti,
    };
    const solutionCategoryId = uuidv4() as SolutionCategoryId;
    const edge: SolutionCategoryEdge = {
      cursor: solutionCategoryId,
      node: {
        id: solutionCategoryId,
        name: 'Threat Intelligence',
        product: [FiligranProduct.Opencti],
      } as unknown as SolutionCategory,
    };
    const pageInfo: PageInfo = {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: solutionCategoryId,
      endCursor: solutionCategoryId,
    };
    const expected: SolutionCategoryConnection = {
      edges: [edge],
      pageInfo,
      totalCount: 1,
    };
    vi.spyOn(solutionCategoryDomain, 'loadSolutionCategories').mockReturnValue(
      expected as unknown as Promise<SolutionCategoryConnection>
    );

    // When
    const result = await solutionCategoryResolver.Query!.solutionCategories!(
      {},
      opts,
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(solutionCategoryDomain.loadSolutionCategories).toHaveBeenCalledWith(
      opts
    );
    expect(result).toEqual(expected);
  });
});

describe('add solution category GraphQL mutation', () => {
  it('should delegate to solutionCategoryDomain.insertSolutionCategory and return result', async () => {
    // Given
    const input: AddSolutionCategoryInput = {
      name: 'Threat Intelligence',
      product: [FiligranProduct.Opencti],
    };
    const expected = {
      id: uuidv4(),
      name: 'Threat Intelligence',
      product: [FiligranProduct.Opencti],
    } as SolutionCategory;
    vi.spyOn(
      solutionCategoryDomain,
      'insertSolutionCategory'
    ).mockResolvedValue(expected);

    // When
    const result = await solutionCategoryResolver.Mutation!
      .addSolutionCategory!(
      {},
      { input },
      contextBypassUser,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(solutionCategoryDomain.insertSolutionCategory).toHaveBeenCalledWith(
      input
    );
    expect(result).toMatchObject({
      name: 'Threat Intelligence',
      product: [FiligranProduct.Opencti],
    });
  });
});

describe('edit solution category GraphQL mutation', () => {
  it('should delegate to solutionCategoryApp.editSolutionCategoryById with typed id and return result', async () => {
    // Given
    const id = uuidv4() as SolutionCategoryId;
    const input = { name: 'Updated Name' };
    const expected = {
      id,
      name: 'Updated Name',
      product: [FiligranProduct.Opencti],
    } as SolutionCategory;
    vi.spyOn(solutionCategoryApp, 'editSolutionCategoryById').mockResolvedValue(
      expected
    );

    // When
    const result = await solutionCategoryResolver.Mutation!
      .editSolutionCategory!(
      {},
      { id, input },
      contextBypassUser,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(solutionCategoryApp.editSolutionCategoryById).toHaveBeenCalledWith(
      id,
      input
    );
    expect(result).toMatchObject({ id, name: 'Updated Name' });
  });
});

describe('delete solution category GraphQL mutation', () => {
  it('should delegate to solutionCategoryApp.deleteSolutionCategoryBy with typed id mutator and return result', async () => {
    // Given
    const id = uuidv4() as SolutionCategoryId;
    const expected = {
      id,
      name: 'Deleted SolutionCategory',
      product: [FiligranProduct.Opencti],
    } as SolutionCategory;
    vi.spyOn(solutionCategoryApp, 'deleteSolutionCategoryBy').mockResolvedValue(
      expected
    );

    // When
    const result = await solutionCategoryResolver.Mutation!
      .deleteSolutionCategory!(
      {},
      { id },
      contextBypassUser,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(solutionCategoryApp.deleteSolutionCategoryBy).toHaveBeenCalledWith({
      id,
    });
    expect(result).toMatchObject({ id });
  });
});
