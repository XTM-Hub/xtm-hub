import { beforeEach, describe, expect, it } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import {
  FiligranProduct,
  OrderingMode,
  UseCaseOrdering,
} from '../../__generated__/resolvers-types';
import { useCaseDomain } from './use-case.domain';

describe('useCaseDomain', () => {
  describe('loadUseCases', () => {
    beforeEach(async () => {
      await TestHelper.useCase.delete({});
    });

    it('should return all use cases when no product filter is provided', async () => {
      await TestHelper.useCase.create({
        name: 'OpenCTI Use Case',
        color: '#ff0000',
        product: [FiligranProduct.Opencti],
      });
      await TestHelper.useCase.create({
        name: 'OpenAEV Use Case',
        color: '#00ff00',
        product: [FiligranProduct.Openaev],
      });

      const result = await useCaseDomain.loadUseCases({
        first: 10,
        orderBy: UseCaseOrdering.Name,
        orderMode: OrderingMode.Asc,
      });

      expect(Number(result.totalCount)).toBe(2);
    });

    it('should filter use cases by product', async () => {
      await TestHelper.useCase.create({
        name: 'OpenCTI Use Case',
        color: '#ff0000',
        product: [FiligranProduct.Opencti],
      });
      await TestHelper.useCase.create({
        name: 'OpenAEV Use Case',
        color: '#00ff00',
        product: [FiligranProduct.Openaev],
      });
      await TestHelper.useCase.create({
        name: 'Both Products Use Case',
        color: '#0000ff',
        product: [FiligranProduct.Opencti, FiligranProduct.Openaev],
      });

      const result = await useCaseDomain.loadUseCases({
        first: 10,
        orderBy: UseCaseOrdering.Name,
        orderMode: OrderingMode.Asc,
        product: FiligranProduct.Opencti,
      });

      expect(Number(result.totalCount)).toBe(2);
      const names = result.edges.map((e) => e.node.name);
      expect(names).toContain('OpenCTI Use Case');
      expect(names).toContain('Both Products Use Case');
      expect(names).not.toContain('OpenAEV Use Case');
    });

    it('should return empty list when no use case matches the product filter', async () => {
      await TestHelper.useCase.create({
        name: 'OpenCTI Use Case',
        color: '#ff0000',
        product: [FiligranProduct.Opencti],
      });

      const result = await useCaseDomain.loadUseCases({
        first: 10,
        orderBy: UseCaseOrdering.Name,
        orderMode: OrderingMode.Asc,
        product: FiligranProduct.Xtmhub,
      });

      expect(Number(result.totalCount)).toBe(0);
      expect(result.edges).toHaveLength(0);
    });

    it('should return use cases with empty product array when no filter is set', async () => {
      await TestHelper.useCase.create({
        name: 'No Product Use Case',
        color: '#aaaaaa',
        product: [],
      });
      await TestHelper.useCase.create({
        name: 'OpenCTI Use Case',
        color: '#ff0000',
        product: [FiligranProduct.Opencti],
      });

      const result = await useCaseDomain.loadUseCases({
        first: 10,
        orderBy: UseCaseOrdering.Name,
        orderMode: OrderingMode.Asc,
      });

      expect(Number(result.totalCount)).toBe(2);
    });
  });

  describe('loadUseCaseByNameCaseInsensitive', () => {
    beforeEach(async () => {
      await TestHelper.useCase.delete({});
    });

    it.each`
      scenario              | fixtureName           | searchName            | expectMatch
      ${'different casing'} | ${'Existing UseCase'} | ${'existing usecase'} | ${true}
      ${'% not a wildcard'} | ${'AutomationSuffix'} | ${'Automat%'}         | ${false}
      ${'_ not a wildcard'} | ${'AutomationX'}      | ${'Automation_'}      | ${false}
    `(
      'should resolve "$searchName" correctly ($scenario)',
      async ({ fixtureName, searchName, expectMatch }) => {
        const created = await TestHelper.useCase.create({
          name: fixtureName,
          color: '#aaaaaa',
        });

        const found =
          await useCaseDomain.loadUseCaseByNameCaseInsensitive(searchName);

        expect(found?.id).toBe(expectMatch ? created.id : undefined);
      }
    );
  });
});
