import { v4 as uuidv4 } from 'uuid';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  contextSimpleUserFiligran2,
  GRAPHQL_RESOLVE_INFO,
  SERVICES,
  TEST_ORGANIZATIONS,
} from '../../../tests/tests.const';
import {
  SubscriptionCapabilityResolvers,
  SubscriptionModel,
  SubscriptionModelResolvers,
} from '../../__generated__/resolvers-types';
import ServiceInstance from '../../model/kanel/public/ServiceInstance';
import { SubscriptionId } from '../../model/kanel/public/Subscription';
import { UnknownErrorCode } from '../../utils/error/error.code';
import * as errorMapping from '../../utils/error/error.mapping';
import { subscriptionApp } from './subscription.app';
import { SubscriptionDomain } from './subscription.domain';
import subscriptionResolver from './subscription.resolver';

describe('subscription resolver - unit tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('subscriptionModel field resolvers', () => {
    it('subscription_capability should call subscriptionCapabilitiesBySubscriptionIdLoader.load with subscription id', async () => {
      // Given
      const id = uuidv4();
      const expected = [] as unknown as Awaited<
        ReturnType<
          typeof SubscriptionDomain.loadSubscriptionCapabilitiesBySubscriptionIds
        >
      >;
      const loadSpy = vi
        .spyOn(
          contextSimpleUserFiligran2.dataLoaders.subscription
            .subscriptionCapabilitiesBySubscriptionIdLoader,
          'load'
        )
        .mockResolvedValue(expected as never);

      // When
      const result = await (
        subscriptionResolver.SubscriptionModel as unknown as SubscriptionModelResolvers
      ).subscription_capability!(
        { id } as SubscriptionModel,
        {},
        contextSimpleUserFiligran2,
        GRAPHQL_RESOLVE_INFO
      );

      // Then
      expect(loadSpy).toHaveBeenCalledWith(id);
      expect(result).toEqual(expected);
    });

    it('service_instance should call serviceInstanceBySubscriptionServiceInstanceIdLoader.load with service_instance_id', async () => {
      // Given
      const serviceInstanceId = SERVICES.INSTANCES.EPIC.ID;
      const expected = { id: serviceInstanceId } as unknown as
        ServiceInstance | undefined;
      const loadSpy = vi
        .spyOn(
          contextSimpleUserFiligran2.dataLoaders.subscription
            .serviceInstanceBySubscriptionServiceInstanceIdLoader,
          'load'
        )
        .mockResolvedValue(expected as never);

      // When
      const result = await (
        subscriptionResolver.SubscriptionModel as unknown as SubscriptionModelResolvers
      ).service_instance!(
        {
          id: uuidv4() as SubscriptionId,
          service_instance_id: serviceInstanceId,
        } as unknown as SubscriptionModel,
        {},
        contextSimpleUserFiligran2,
        GRAPHQL_RESOLVE_INFO
      );

      // Then
      expect(loadSpy).toHaveBeenCalledWith(serviceInstanceId);
      expect(result).toEqual(expected);
    });

    it('user_service should call userServicesBySubscriptionIdLoader.load with subscription id', async () => {
      // Given
      const id = uuidv4();
      const expected = [] as unknown as Awaited<
        ReturnType<typeof SubscriptionDomain.loadUserServicesBySubscriptionIds>
      >;
      const loadSpy = vi
        .spyOn(
          contextSimpleUserFiligran2.dataLoaders.subscription
            .userServicesBySubscriptionIdLoader,
          'load'
        )
        .mockResolvedValue(expected as never);

      // When
      const result = await (
        subscriptionResolver.SubscriptionModel as unknown as SubscriptionModelResolvers
      ).user_service!(
        { id } as SubscriptionModel,
        {},
        contextSimpleUserFiligran2,
        GRAPHQL_RESOLVE_INFO
      );

      // Then
      expect(loadSpy).toHaveBeenCalledWith(id);
      expect(result).toEqual(expected);
    });

    it('organization should call organizationBySubscriptionOrganizationIdLoader.load with organization_id', async () => {
      // Given
      const organizationId = TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID;
      const expected = { id: organizationId };
      const loadSpy = vi
        .spyOn(
          contextSimpleUserFiligran2.dataLoaders.subscription
            .organizationBySubscriptionOrganizationIdLoader,
          'load'
        )
        .mockResolvedValue(expected as never);

      // When
      const result = await (
        subscriptionResolver.SubscriptionModel as unknown as SubscriptionModelResolvers
      ).organization!(
        {
          id: uuidv4() as SubscriptionId,
          organization_id: organizationId,
        } as unknown as SubscriptionModel,
        {},
        contextSimpleUserFiligran2,
        GRAPHQL_RESOLVE_INFO
      );

      // Then
      expect(loadSpy).toHaveBeenCalledWith(organizationId);
      expect(result).toMatchObject(expected);
    });
  });

  describe('subscriptionCapability field resolvers', () => {
    it('service_capability should call serviceCapabilityBySubscriptionCapabilityIdLoader.load with subscription capability id', async () => {
      // Given
      const id = uuidv4();
      const expected = { id: uuidv4() } as unknown as Awaited<
        ReturnType<
          typeof SubscriptionDomain.loadServiceCapabilitiesBySubscriptionCapabilityIds
        >
      >;
      const loadSpy = vi
        .spyOn(
          contextSimpleUserFiligran2.dataLoaders.subscription
            .serviceCapabilityBySubscriptionCapabilityIdLoader,
          'load'
        )
        .mockResolvedValue(expected as never);

      // When
      const result = await (
        subscriptionResolver.SubscriptionCapability as unknown as SubscriptionCapabilityResolvers
      ).service_capability!(
        { id },
        {},
        contextSimpleUserFiligran2,
        GRAPHQL_RESOLVE_INFO
      );

      // Then
      expect(loadSpy).toHaveBeenCalledWith(id);
      expect(result).toEqual(expected);
    });
  });

  describe('query.subscriptionById', () => {
    it('should return the first subscription when helper returns values', async () => {
      // Given
      const subscriptionId = uuidv4() as SubscriptionId;
      const expected = { id: subscriptionId } as Awaited<
        ReturnType<
          typeof SubscriptionDomain.loadSubscriptionWithOrganizationAndCapabilitiesBy
        >
      >[number];
      vi.spyOn(
        SubscriptionDomain,
        'loadSubscriptionWithOrganizationAndCapabilitiesBy'
      ).mockResolvedValue([expected] as never);

      // When
      const result = await subscriptionResolver.Query!.subscriptionById!(
        {},
        { subscription_id: subscriptionId },
        contextSimpleUserFiligran2,
        GRAPHQL_RESOLVE_INFO
      );

      // Then
      expect(
        SubscriptionDomain.loadSubscriptionWithOrganizationAndCapabilitiesBy
      ).toHaveBeenCalledWith(
        expect.objectContaining({ 'Subscription.id': subscriptionId })
      );
      expect(result).toMatchObject({ id: subscriptionId });
    });

    it('should return undefined when helper returns an empty array', async () => {
      // Given
      const subscriptionId = uuidv4() as SubscriptionId;
      vi.spyOn(
        SubscriptionDomain,
        'loadSubscriptionWithOrganizationAndCapabilitiesBy'
      ).mockResolvedValue([]);

      // When
      const result = await subscriptionResolver.Query!.subscriptionById!(
        {},
        { subscription_id: subscriptionId },
        contextSimpleUserFiligran2,
        GRAPHQL_RESOLVE_INFO
      );

      // Then
      expect(result).toBeUndefined();
    });
  });

  describe('query.subscriptions', () => {
    it('should delegate to subscriptionApp.loadSubscriptions with provided options', async () => {
      // Given
      const opt = { first: 10 };
      const expected = [{ id: uuidv4() as SubscriptionId }];
      vi.spyOn(subscriptionApp, 'loadSubscriptions').mockResolvedValue(
        expected as never
      );

      // When
      const result = await subscriptionResolver.Query!.subscriptions!(
        {},
        opt as never,
        contextSimpleUserFiligran2,
        GRAPHQL_RESOLVE_INFO
      );

      // Then
      expect(subscriptionApp.loadSubscriptions).toHaveBeenCalledWith(opt);
      expect(result).toMatchObject(expected);
    });
  });

  describe('mutation.createSubscriptions', () => {
    const serviceInstanceId = SERVICES.INSTANCES.EPIC.ID;
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2026-01-01');
    const capabilityIds = [
      SERVICES.INSTANCES.INTEGRATIONS.CAPABILITIES.UPLOAD.ID,
    ];

    it.each`
      inputOrganizationId                                                            | expectedOrganizationIds
      ${[TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID]}                                 | ${[TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID]}
      ${[TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID, TEST_ORGANIZATIONS.FILIGRAN.ID]} | ${[TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID, TEST_ORGANIZATIONS.FILIGRAN.ID]}
    `(
      'should map organization_id=$inputOrganizationId to organizationIds=$expectedOrganizationIds',
      async ({ inputOrganizationId, expectedOrganizationIds }) => {
        // Given
        const expected = {
          id: uuidv4() as SubscriptionId,
        } as unknown as SubscriptionModel;
        vi.spyOn(
          subscriptionApp,
          'subscribeOrganizationsToService'
        ).mockResolvedValue(expected as never);

        // When
        const result = await subscriptionResolver.Mutation!
          .createSubscriptions!(
          {},
          {
            input: {
              organization_id: inputOrganizationId,
              service_instance_id: serviceInstanceId,
              start_date: startDate,
              end_date: endDate,
              capability_ids: capabilityIds,
            },
          },
          contextSimpleUserFiligran2,
          GRAPHQL_RESOLVE_INFO
        );

        // Then
        expect(
          subscriptionApp.subscribeOrganizationsToService
        ).toHaveBeenCalledWith({
          organizationIds: expectedOrganizationIds,
          serviceInstanceId,
          startDate,
          endDate,
          capabilityIds,
        });
        expect(result).toMatchObject({ id: expected.id });
      }
    );
  });

  describe('mutation.deleteSubscriptions', () => {
    it('should call subscriptionApp.deleteSubscriptions with subscription_id', async () => {
      // Given
      const subscriptionId = uuidv4() as SubscriptionId;
      const expected = { id: subscriptionId };
      vi.spyOn(subscriptionApp, 'deleteSubscriptions').mockResolvedValue(
        expected as never
      );

      // When
      const result = await subscriptionResolver.Mutation!.deleteSubscriptions!(
        {},
        { subscription_ids: [subscriptionId] },
        contextSimpleUserFiligran2,
        GRAPHQL_RESOLVE_INFO
      );

      // Then
      expect(subscriptionApp.deleteSubscriptions).toHaveBeenCalledWith([
        subscriptionId,
      ]);
      expect(result).toMatchObject(expected);
    });
  });

  describe('mutation.updateSubscription', () => {
    it('should map input and call subscriptionApp.updateSubscription', async () => {
      // Given
      const subscriptionId = uuidv4() as SubscriptionId;
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2026-01-01');
      const capabilityIds = [
        SERVICES.INSTANCES.INTEGRATIONS.CAPABILITIES.UPLOAD.ID,
      ];
      const expected = { id: subscriptionId };
      vi.spyOn(subscriptionApp, 'updateSubscription').mockResolvedValue(
        expected as never
      );

      // When
      const result = await subscriptionResolver.Mutation!.updateSubscription!(
        {},
        {
          subscription_id: subscriptionId,
          input: {
            start_date: startDate,
            end_date: endDate,
            capability_ids: capabilityIds,
          },
        },
        contextSimpleUserFiligran2,
        GRAPHQL_RESOLVE_INFO
      );

      // Then
      expect(subscriptionApp.updateSubscription).toHaveBeenCalledWith({
        id: subscriptionId,
        startDate,
        endDate,
        capabilityIds,
      });
      expect(result).toMatchObject(expected);
    });
  });

  describe('mutation error mapping', () => {
    it.each`
      mutationName             | runMutation                                                                                                                                                            | setupAppMock                                                                                   | expectedCode
      ${'createSubscriptions'} | ${() =>
        subscriptionResolver.Mutation!.createSubscriptions!(
          {},
          {
            input: {
              organization_id: [TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID] as never,
              service_instance_id: SERVICES.INSTANCES.EPIC.ID,
              start_date: new Date('2025-01-01'),
              end_date: new Date('2026-01-01'),
              capability_ids: [SERVICES.INSTANCES.INTEGRATIONS.CAPABILITIES.UPLOAD.ID],
            },
          },
          contextSimpleUserFiligran2,
          GRAPHQL_RESOLVE_INFO
        )} | ${() => vi.spyOn(subscriptionApp, 'subscribeOrganizationsToService').mockRejectedValue(new Error('boom'))} | ${UnknownErrorCode.ServiceSubscriptionError}
      ${'deleteSubscriptions'} | ${() => subscriptionResolver.Mutation!.deleteSubscriptions!({}, { subscription_ids: [uuidv4() as SubscriptionId] }, contextSimpleUserFiligran2, GRAPHQL_RESOLVE_INFO)} | ${() => vi.spyOn(subscriptionApp, 'deleteSubscriptions').mockRejectedValue(new Error('boom'))} | ${UnknownErrorCode.DeleteSubscriptionError}
      ${'updateSubscription'} | ${() =>
        subscriptionResolver.Mutation!.updateSubscription!(
          {},
          {
            subscription_id: uuidv4() as SubscriptionId,
            input: {
              start_date: new Date('2025-01-01'),
              end_date: new Date('2026-01-01'),
              capability_ids: [SERVICES.INSTANCES.INTEGRATIONS.CAPABILITIES.UPLOAD.ID],
            },
          },
          contextSimpleUserFiligran2,
          GRAPHQL_RESOLVE_INFO
        )} | ${() => vi.spyOn(subscriptionApp, 'updateSubscription').mockRejectedValue(new Error('boom'))} | ${UnknownErrorCode.ServiceSubscriptionError}
    `(
      'should map $mutationName errors with $expectedCode',
      async ({ runMutation, setupAppMock, expectedCode }) => {
        // Given
        setupAppMock();
        const mappedError = new Error('mapped error');
        const mapToGraphQLErrorSpy = vi
          .spyOn(errorMapping, 'mapToGraphQLError')
          .mockReturnValue(mappedError as never);

        // When
        const run = runMutation();

        // Then
        await expect(run).rejects.toBe(mappedError);
        expect(mapToGraphQLErrorSpy).toHaveBeenCalledWith(
          expect.any(Error),
          expectedCode
        );
      }
    );
  });
});
