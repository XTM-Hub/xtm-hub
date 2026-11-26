import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import {
  OrderingMode,
  SaasPlatformOrdering,
  SaasProduct,
} from '../../__generated__/resolvers-types';
import { SaasManagerInstanceDomain } from './saas-manager-instance.domain';

const CUSTOMER = 'Domain test customer';
const PLANS = ['XL', 'custom', 'S', 'XS', 'l', 'M'];

describe('saas manager instance domain', () => {
  describe('loadInServiceInstances', () => {
    const idsByPlan = new Map<string, string>();
    const otherIds: string[] = [];

    beforeAll(async () => {
      for (const plan of PLANS) {
        idsByPlan.set(
          plan,
          await TestHelper.saasManagerInstance.create({
            customer_name: CUSTOMER,
            product: plan === 'M' ? SaasProduct.Oaev : SaasProduct.Octi,
            data: { plan },
          })
        );
      }
      otherIds.push(
        await TestHelper.saasManagerInstance.create({
          customer_name: CUSTOMER,
          status_family: '__removed_family__',
        }),
        await TestHelper.saasManagerInstance.create({
          customer_name: 'Another customer',
          customer_techname: 'domain-test-techname',
        }),
        await TestHelper.saasManagerInstance.create({
          customer_name: 'Another customer',
          hostname: 'domain-test.example.com',
        })
      );
    });

    afterAll(async () => {
      await TestHelper.saasManagerInstance.delete([
        ...idsByPlan.values(),
        ...otherIds,
      ]);
    });

    const pagination = {
      first: 50,
      orderBy: SaasPlatformOrdering.Plan,
      orderMode: OrderingMode.Asc,
      searchTerm: CUSTOMER,
    };

    const idsOf = (connection: { edges: { node: { id: string } }[] }) =>
      connection.edges.map(({ node }) => node.id);

    it.each([
      [
        'from the smallest',
        OrderingMode.Asc,
        ['XS', 'S', 'M', 'l', 'XL', 'custom'],
      ],
      [
        'from the largest',
        OrderingMode.Desc,
        ['XL', 'l', 'M', 'S', 'XS', 'custom'],
      ],
    ])(
      'should order the plans named as a size %s, the others after them, leaving out the instances not in service',
      async (_, orderMode, expectedPlans) => {
        // When
        const connection =
          await SaasManagerInstanceDomain.loadInServiceInstances({
            ...pagination,
            orderMode,
          });

        // Then
        expect({
          totalCount: connection.totalCount,
          ids: idsOf(connection),
        }).toEqual({
          totalCount: PLANS.length,
          ids: expectedPlans.map((plan) => idsByPlan.get(plan)),
        });
      }
    );

    it('should return the page after the cursor', async () => {
      // When
      const connection = await SaasManagerInstanceDomain.loadInServiceInstances(
        { ...pagination, first: 2, after: btoa('2') }
      );

      // Then
      expect({
        totalCount: connection.totalCount,
        ids: idsOf(connection),
        hasNextPage: connection.pageInfo.hasNextPage,
      }).toEqual({
        totalCount: PLANS.length,
        ids: [idsByPlan.get('M'), idsByPlan.get('l')],
        hasNextPage: true,
      });
    });

    it('should keep the instances of the product', async () => {
      // When
      const connection = await SaasManagerInstanceDomain.loadInServiceInstances(
        { ...pagination, product: SaasProduct.Oaev }
      );

      // Then
      expect(idsOf(connection)).toEqual([idsByPlan.get('M')]);
    });

    it.each([
      ['the technical name of the customer', 'DOMAIN-TEST-TECHNAME', 1],
      ['the hostname', 'domain-test.example', 2],
    ])(
      'should search the instances on %s, whatever the case',
      async (_, searchTerm, expectedIndex) => {
        // When
        const connection =
          await SaasManagerInstanceDomain.loadInServiceInstances({
            ...pagination,
            searchTerm,
          });

        // Then
        expect(idsOf(connection)).toEqual([otherIds[expectedIndex]]);
      }
    );
  });
});
