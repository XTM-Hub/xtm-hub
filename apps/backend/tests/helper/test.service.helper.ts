import { v4 as uuidv4 } from 'uuid';
import { expect } from 'vitest';
import { db } from '../../knexfile';
import {
  SeoServiceInstanceLanguage,
  ServiceDefinitionIdentifier,
} from '../../src/__generated__/resolvers-types';
import SEOServiceInstance, {
  SEOServiceInstanceMutator,
} from '../../src/model/kanel/public/SEOServiceInstance';
import ServiceCapability, {
  ServiceCapabilityId,
  ServiceCapabilityMutator,
} from '../../src/model/kanel/public/ServiceCapability';
import ServiceDefinition, {
  ServiceDefinitionId,
  ServiceDefinitionMutator,
} from '../../src/model/kanel/public/ServiceDefinition';
import ServiceGroup, {
  ServiceGroupId,
  ServiceGroupMutator,
} from '../../src/model/kanel/public/ServiceGroup';
import ServiceGroupUser, {
  ServiceGroupUserMutator,
} from '../../src/model/kanel/public/ServiceGroupUser';
import ServiceInstance, {
  ServiceInstanceId,
  ServiceInstanceMutator,
} from '../../src/model/kanel/public/ServiceInstance';
import ServiceLink, {
  ServiceLinkId,
  ServiceLinkMutator,
} from '../../src/model/kanel/public/ServiceLink';
import SubscriptionCapability, {
  SubscriptionCapabilityId,
  SubscriptionCapabilityInitializer,
  SubscriptionCapabilityMutator,
} from '../../src/model/kanel/public/SubscriptionCapability';
import { SERVICES } from '../tests.const';

export const TestServiceHelper = {
  serviceDefinition: {
    load: async (
      field: ServiceDefinitionMutator
    ): Promise<ServiceDefinition | undefined> => {
      return db<ServiceDefinition>('ServiceDefinition')
        .where(field)
        .select('*')
        .first();
    },
    create: async (
      data?: Partial<ServiceDefinition>
    ): Promise<ServiceDefinition> => {
      const [serviceDefinition] = await db<ServiceDefinition>(
        'ServiceDefinition'
      )
        .insert({
          id: uuidv4() as ServiceDefinitionId,
          name: 'Default name serviceDefinition',
          identifier: ServiceDefinitionIdentifier.OpenctiRegistration,
          ...data,
        })
        .returning('*');
      expect(serviceDefinition).toBeDefined();
      return serviceDefinition!;
    },
    delete: async (field: ServiceDefinitionMutator) => {
      await db<ServiceDefinition>('ServiceDefinition').where(field).del();
    },
  },
  serviceCapability: {
    create: async (
      data?: ServiceCapabilityMutator
    ): Promise<ServiceCapability> => {
      const [serviceCapability] = await db<ServiceCapability>(
        'Service_Capability'
      )
        .insert({
          id: uuidv4() as ServiceCapabilityId,
          name: 'RANDOM SERVICE CAPABILITY',
          description: 'This is a short description',
          ...data,
        })
        .returning('*');
      return serviceCapability!;
    },
    delete: async (field: ServiceCapabilityMutator) => {
      await db<ServiceCapability>('Service_Capability').where(field).del();
    },
  },
  serviceInstance: {
    create: async (
      data?: Partial<ServiceInstance>
    ): Promise<ServiceInstance> => {
      const [serviceInstance] = await db<ServiceInstance>('ServiceInstance')
        .insert({
          id: uuidv4() as ServiceInstanceId,
          name: 'Default name serviceInstance',
          service_definition_id: SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID,
          tags: [],
          public: true,
          ...data,
        })
        .returning('*')
        .onConflict()
        .ignore();
      return serviceInstance!;
    },
    delete: async (field: ServiceInstanceMutator) => {
      await db<ServiceInstance>('ServiceInstance').where(field).del();
    },
    load: async (
      field: ServiceInstanceMutator
    ): Promise<ServiceInstance | undefined> => {
      return db<ServiceInstance>('ServiceInstance')
        .where(field)
        .select('*')
        .first();
    },
  },
  serviceLink: {
    create: async (data?: Partial<ServiceLink>): Promise<ServiceLink> => {
      const [serviceLink] = await db<ServiceLink>('Service_Link')
        .insert({
          id: uuidv4() as ServiceLinkId,
          name: 'Default name serviceLink',
          url: '/service/default',
          ...data,
        })
        .returning('*');
      return serviceLink!;
    },
    delete: async (field: ServiceLinkMutator) => {
      await db<ServiceLink>('Service_Link').where(field).del();
    },
  },
  seoServiceInstance: {
    create: async (
      data: Partial<SEOServiceInstance> & {
        service_instance_id: ServiceInstanceId;
        language: SeoServiceInstanceLanguage;
      }
    ): Promise<SEOServiceInstance> => {
      const [seoServiceInstance] = await db<SEOServiceInstance>(
        'SEO_ServiceInstance'
      )
        .insert({
          meta_title: 'Default meta title',
          meta_description: 'Default meta description',
          ...data,
        })
        .returning('*');
      return seoServiceInstance!;
    },
    delete: async (field: SEOServiceInstanceMutator) => {
      await db<SEOServiceInstance>('SEO_ServiceInstance').where(field).del();
    },
    loadAll: async (
      field: SEOServiceInstanceMutator
    ): Promise<SEOServiceInstance[]> => {
      return db<SEOServiceInstance[]>('SEO_ServiceInstance')
        .where(field)
        .select('*');
    },
  },
  serviceGroup: {
    create: async (data?: ServiceGroupMutator): Promise<ServiceGroup> => {
      const [serviceGroup] = await db<ServiceGroup>('ServiceGroup')
        .insert({
          id: uuidv4() as ServiceGroupId,
          name: 'Analyst',
          ...data,
        })
        .returning('*')
        .onConflict()
        .ignore();
      return serviceGroup!;
    },
    load: async (
      field: ServiceGroupMutator
    ): Promise<ServiceGroup[] | undefined> => {
      return db<ServiceGroup[]>('ServiceGroup').where(field).select('*');
    },
    delete: async (field: ServiceGroupMutator) => {
      await db<ServiceGroup>('ServiceGroup').where(field).del();
    },
  },
  serviceGroupUser: {
    create: async (
      data?: ServiceGroupUserMutator
    ): Promise<ServiceGroupUser> => {
      const [serviceGroupUser] = await db<ServiceGroupUser>('ServiceGroup_User')
        .insert({
          ...data,
        })
        .returning('*')
        .onConflict()
        .ignore();
      return serviceGroupUser!;
    },
    load: async (
      field: ServiceGroupUserMutator
    ): Promise<ServiceGroupUser[] | undefined> => {
      return db<ServiceGroupUser[]>('ServiceGroup_User')
        .where(field)
        .select('*');
    },
    delete: async (field: ServiceGroupUserMutator) => {
      await db<ServiceGroupUser>('ServiceGroup_User').where(field).del();
    },
  },
  subscriptionCapability: {
    create: async (
      data?: Partial<SubscriptionCapabilityInitializer>
    ): Promise<SubscriptionCapability> => {
      const [subscriptionCapability] = await db<SubscriptionCapability>(
        'Subscription_Capability'
      )
        .insert({
          id: uuidv4() as SubscriptionCapabilityId,
          ...data,
        })
        .returning('*');
      return subscriptionCapability!;
    },
    delete: async (field: SubscriptionCapabilityMutator) => {
      await db<SubscriptionCapability>('Subscription_Capability')
        .where(field)
        .delete();
    },
  },
};
