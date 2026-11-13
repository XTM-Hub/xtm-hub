import { v4 as uuidv4 } from 'uuid';
import { describe, vi } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import {
  FiligranProduct,
  OrderingMode,
  SolutionCategoryOrdering,
} from '../../__generated__/resolvers-types';
import { ErrorType } from '../../utils/error/error.type';
import { solutionCategoryApp } from './solution-category.app';
import { solutionCategoryDomain } from './solution-category.domain';

const ADMIN_ONLY = {
  anonymous: ErrorType.Unauthenticated,
  user: ErrorType.ForbiddenAccess,
  admin: 'allowed',
} as const;

// The matrix spies on the guarded function after prepare(), so fixtures made here are not counted
const createSolutionCategory = () =>
  solutionCategoryDomain.insertSolutionCategory({
    name: `access-matrix-${uuidv4()}`,
    product: [FiligranProduct.Opencti],
  });

describe('solutionCategories query', () => {
  TestHelper.expectAccessMatrix({
    operation: `query ($searchTerm: String) {
      solutionCategories(
        first: 10
        orderBy: ${SolutionCategoryOrdering.Name}
        orderMode: ${OrderingMode.Asc}
        searchTerm: $searchTerm
      ) {
        totalCount
        edges { node { name } }
      }
    }`,
    guarded: () => vi.spyOn(solutionCategoryDomain, 'loadSolutionCategories'),
    expected: { anonymous: 'allowed', user: 'allowed', admin: 'allowed' },
    prepare: async () => {
      const category = await createSolutionCategory();
      return {
        variables: { searchTerm: category.name },
        expectedData: {
          solutionCategories: {
            totalCount: 1,
            edges: [{ node: { name: category.name } }],
          },
        },
        cleanup: async () => {
          await solutionCategoryDomain.deleteSolutionCategory({
            id: category.id,
          });
        },
      };
    },
  });
});

describe('addSolutionCategory mutation', () => {
  TestHelper.expectAccessMatrix({
    operation: `mutation ($input: AddSolutionCategoryInput!) {
      addSolutionCategory(input: $input) { name product }
    }`,
    guarded: () => vi.spyOn(solutionCategoryDomain, 'insertSolutionCategory'),
    expected: ADMIN_ONLY,
    prepare: () => {
      const name = `access-matrix-add-${uuidv4()}`;
      return Promise.resolve({
        variables: { input: { name, product: [FiligranProduct.Opencti] } },
        expectedData: {
          addSolutionCategory: { name, product: [FiligranProduct.Opencti] },
        },
        cleanup: async () => {
          await solutionCategoryDomain.deleteSolutionCategory({ name });
        },
      });
    },
  });
});

describe('editSolutionCategory mutation', () => {
  TestHelper.expectAccessMatrix({
    operation: `mutation ($id: ID!, $input: EditSolutionCategoryInput!) {
      editSolutionCategory(id: $id, input: $input) { name }
    }`,
    guarded: () => vi.spyOn(solutionCategoryApp, 'editSolutionCategoryById'),
    expected: ADMIN_ONLY,
    prepare: async () => {
      const category = await createSolutionCategory();
      const name = `access-matrix-edit-${uuidv4()}`;
      return {
        variables: { id: category.id, input: { name } },
        expectedData: { editSolutionCategory: { name } },
        cleanup: async () => {
          await solutionCategoryDomain.deleteSolutionCategory({
            id: category.id,
          });
        },
      };
    },
  });
});

describe('deleteSolutionCategory mutation', () => {
  TestHelper.expectAccessMatrix({
    operation: `mutation ($id: ID!) {
      deleteSolutionCategory(id: $id) { name }
    }`,
    guarded: () => vi.spyOn(solutionCategoryApp, 'deleteSolutionCategoryBy'),
    expected: ADMIN_ONLY,
    prepare: async () => {
      const category = await createSolutionCategory();
      return {
        variables: { id: category.id },
        expectedData: { deleteSolutionCategory: { name: category.name } },
        cleanup: async () => {
          await solutionCategoryDomain.deleteSolutionCategory({
            id: category.id,
          });
        },
      };
    },
  });
});
