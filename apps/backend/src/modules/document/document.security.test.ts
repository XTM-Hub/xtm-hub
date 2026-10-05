import { v4 as uuidv4 } from 'uuid';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ServiceDefinitionIdentifier,
  ServiceRestriction,
} from '../../__generated__/resolvers-types';
import { OrganizationId } from '../../model/kanel/public/Organization';
import { ServiceDefinitionId } from '../../model/kanel/public/ServiceDefinition';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { UserId } from '../../model/kanel/public/User';
import { UserLoadUserBy } from '../../model/user';
import * as access from '../../security/access';
import { ErrorCode } from '../../utils/error/error.code';
import { UserServiceCapabilityHelper } from '../security-management/user-service-capability/user-service-capability.helper';
import { ServiceInstanceDomain } from '../service/instance/service-instance.domain';
import { isUserRestrictedToActiveDocument } from './document.security';

const organizationId = uuidv4() as OrganizationId;

const mockUser = {
  id: uuidv4() as UserId,
  selected_organization_id: organizationId as OrganizationId,
  capabilities: [],
  roles_portal: [],
  organizations: [],
  selected_org_capabilities: [],
  created_at: new Date(),
  updated_at: new Date(),
  last_login_at: null,
  organization_id: organizationId,
} as unknown as UserLoadUserBy;

const mockServiceInstanceId = uuidv4() as ServiceInstanceId;

const mockServiceDefinition = (identifier: ServiceDefinitionIdentifier) => ({
  __typename: 'ServiceDefinition' as const,
  id: uuidv4() as ServiceDefinitionId,
  identifier,
  name: identifier.toString(),
  description: '',
  created_at: new Date(),
  updated_at: new Date(),
  public: false,
  service_capability: [],
});

describe('document security', () => {
  describe('isUserRestrictedToActiveDocument', () => {
    beforeEach(() => {
      vi.spyOn(access, 'isUserAdminPlatform').mockReturnValue(false);
      vi.spyOn(
        UserServiceCapabilityHelper,
        'loadCapabilities'
      ).mockResolvedValue([]);
      vi.spyOn(
        ServiceInstanceDomain,
        'loadServiceDefinitionByServiceInstance'
      ).mockResolvedValue(
        mockServiceDefinition(
          ServiceDefinitionIdentifier.OpenctiCustomDashboards
        )
      );
    });

    it('should return false when user is a platform admin', async () => {
      vi.spyOn(access, 'isUserAdminPlatform').mockReturnValue(true);
      const result = await isUserRestrictedToActiveDocument(
        mockUser,
        mockServiceInstanceId
      );
      expect(result).toBe(false);
    });

    it.each`
      identifier
      ${ServiceDefinitionIdentifier.OpenctiCustomDashboards}
      ${ServiceDefinitionIdentifier.OpenctiCustomViews}
      ${ServiceDefinitionIdentifier.OpenctiHuntPacks}
      ${ServiceDefinitionIdentifier.OpenctiIntegrations}
    `(
      'should return true when user lacks Upload capability in the restricted service $identifier',
      async ({ identifier }) => {
        vi.spyOn(
          ServiceInstanceDomain,
          'loadServiceDefinitionByServiceInstance'
        ).mockResolvedValue(mockServiceDefinition(identifier));
        const result = await isUserRestrictedToActiveDocument(
          mockUser,
          mockServiceInstanceId
        );
        expect(result).toBe(true);
      }
    );

    it.each([
      ServiceDefinitionIdentifier.OpenctiIntegrations,
      ServiceDefinitionIdentifier.OpenctiCustomDashboards,
      ServiceDefinitionIdentifier.OpenctiCustomViews,
      ServiceDefinitionIdentifier.OpenctiPlaybooks,
      ServiceDefinitionIdentifier.OpenaevScenarios,
    ])(
      'should return true without Upload capability on %s',
      async (identifier) => {
        vi.spyOn(
          ServiceInstanceDomain,
          'loadServiceDefinitionByServiceInstance'
        ).mockResolvedValue(mockServiceDefinition(identifier));

        const result = await isUserRestrictedToActiveDocument(
          mockUser,
          mockServiceInstanceId
        );

        expect(result).toBe(true);
      }
    );

    it.each([
      ServiceDefinitionIdentifier.OpenctiIntegrations,
      ServiceDefinitionIdentifier.OpenctiCustomDashboards,
      ServiceDefinitionIdentifier.OpenctiCustomViews,
      ServiceDefinitionIdentifier.OpenctiPlaybooks,
      ServiceDefinitionIdentifier.OpenaevScenarios,
    ])(
      'should return false with Upload capability on %s',
      async (identifier) => {
        vi.spyOn(
          UserServiceCapabilityHelper,
          'loadCapabilities'
        ).mockResolvedValue([ServiceRestriction.Upload]);
        vi.spyOn(
          ServiceInstanceDomain,
          'loadServiceDefinitionByServiceInstance'
        ).mockResolvedValue(mockServiceDefinition(identifier));

        const result = await isUserRestrictedToActiveDocument(
          mockUser,
          mockServiceInstanceId
        );

        expect(result).toBe(false);
      }
    );

    it('should return false when user lacks Upload capability but service definition is not restricted', async () => {
      vi.spyOn(
        ServiceInstanceDomain,
        'loadServiceDefinitionByServiceInstance'
      ).mockResolvedValue(
        mockServiceDefinition(ServiceDefinitionIdentifier.Link)
      );
      const result = await isUserRestrictedToActiveDocument(
        mockUser,
        mockServiceInstanceId
      );
      expect(result).toBe(false);
    });

    it('should return false when user has Upload capability and service definition is restricted', async () => {
      vi.spyOn(
        UserServiceCapabilityHelper,
        'loadCapabilities'
      ).mockResolvedValue([ServiceRestriction.Upload]);
      const result = await isUserRestrictedToActiveDocument(
        mockUser,
        mockServiceInstanceId
      );
      expect(result).toBe(false);
    });

    it('should return true when capabilities are undefined', async () => {
      vi.spyOn(
        UserServiceCapabilityHelper,
        'loadCapabilities'
      ).mockResolvedValue(undefined);
      const result = await isUserRestrictedToActiveDocument(
        mockUser,
        mockServiceInstanceId
      );
      expect(result).toBe(true);
    });

    it('should throw when service definition is not found', async () => {
      vi.spyOn(
        ServiceInstanceDomain,
        'loadServiceDefinitionByServiceInstance'
      ).mockResolvedValue(undefined);
      const call = isUserRestrictedToActiveDocument(
        mockUser,
        mockServiceInstanceId
      );
      await expect(call).rejects.toThrow(ErrorCode.ServiceDefinitionNotFound);
    });
  });
});
