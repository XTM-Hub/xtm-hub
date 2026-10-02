import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  // eslint-disable-next-line no-restricted-imports
  requestContextAdminUser,
} from '../../../../tests/tests.const';
import { OrganizationCapability } from '../../../__generated__/resolvers-types';
import { requestContext } from '../../../context/request.context';
import Organization, {
  OrganizationId,
} from '../../../model/kanel/public/Organization';
import { UserId } from '../../../model/kanel/public/User';
import { UserLoadUserBy } from '../../../model/user';
import { logApp } from '../../../utils/app-logger.util';
import { UserOrganizationCapabilityDomain } from '../../security-management/user-organization-capability/user-organization-capability.domain';
import { OrganizationDomain } from '../organization/organization.domain';
import { UserDomain } from './user-domain/user.domain';
import { UserOrganizationDomain } from './user-organization/user-organization.domain';
import { UserProvisioningApp } from './user-provisioning/user-provisioning.app';
import { isUserLastOrganizationAdministrator, UserHelper } from './user.helper';

describe('user helpers', async () => {
  afterEach(async () => {
    vi.useRealTimers();
  });

  describe('delete last administrator prevention', () => {
    const organizationName = 'test-new-organization.fr';
    let organization: Organization;
    let user: UserLoadUserBy;
    let anotherUser: UserLoadUserBy | undefined;

    beforeEach(async () => {
      const userEmail = `testLastOrganizationAdministrator${uuidv4()}@${organizationName}`;
      await UserProvisioningApp.autoProvisionNewUser({
        email: userEmail,
      });
      const loadedOrganization = await OrganizationDomain.loadOrganizationBy({
        name: organizationName,
      });

      expect(loadedOrganization).toBeTruthy();
      organization = loadedOrganization!;
      const loadedUser = await UserDomain.loadUserBy({ email: userEmail });
      user = loadedUser!;
    });

    afterEach(async () => {
      if (user) {
        await UserHelper.removeUser({ email: user.email });
      }
      if (anotherUser) {
        await UserHelper.removeUser({ email: anotherUser.email });
        anotherUser = undefined;
      }
      if (organization) {
        await OrganizationDomain.deleteOrganizationBy({
          name: organizationName,
        });
      }
    });

    describe('preventAdministratorRemovalOfOneOrganization', () => {
      it(`should throw an error when user is the last with ${OrganizationCapability.AdministrateOrganization}`, async () => {
        const call = UserHelper.preventAdministratorRemovalOfOneOrganization(
          user.id,
          organization.id
        );

        await expect(call).rejects.toThrow('CANT_REMOVE_LAST_ADMINISTRATOR');
      });

      it(`should not throw when another user in the organization has ${OrganizationCapability.AdministrateOrganization}`, async () => {
        requestContext.set(requestContextAdminUser);

        const anotherUserEmail = `testLastOrganizationAdministrator-anotherUser${uuidv4()}@${organizationName}`;
        await UserProvisioningApp.autoProvisionNewUser({
          email: anotherUserEmail,
        });

        anotherUser = (await UserDomain.loadUserBy({
          'User.email': anotherUserEmail,
        }))!;

        const [anotherUserOrgRelation] =
          await UserOrganizationDomain.createUserOrganizationRelationAndRemovePending(
            {
              user_id: anotherUser.id,
              organizations_id: [organization.id],
            }
          );
        expect(anotherUserOrgRelation).toBeTruthy();

        await UserOrganizationCapabilityDomain.createUserOrganizationCapability(
          {
            user_organization_id: anotherUserOrgRelation!.id,
            capabilities_name: [
              OrganizationCapability.AdministrateOrganization,
            ],
          }
        );

        const result =
          await UserHelper.preventAdministratorRemovalOfOneOrganization(
            user.id,
            organization.id
          );

        expect(result).toBeUndefined();
      });
    });

    describe('preventAdministratorRemovalOfAllOrganizations', () => {
      it(`should throw an error when user is the last with ${OrganizationCapability.AdministrateOrganization} and we specify empty capabilities`, async () => {
        const call = UserHelper.preventAdministratorRemovalOfAllOrganizations(
          user.id,
          [
            {
              organizationId: organization.id,
              capabilities: [],
            },
          ]
        );

        await expect(call).rejects.toThrow('CANT_REMOVE_LAST_ADMINISTRATOR');
      });

      it(`should throw an error when user is the last with ${OrganizationCapability.AdministrateOrganization} and we don't specify new capabilities`, async () => {
        const call = UserHelper.preventAdministratorRemovalOfAllOrganizations(
          user.id,
          []
        );

        await expect(call).rejects.toThrow('CANT_REMOVE_LAST_ADMINISTRATOR');
      });

      it(`should not throw when another user in the organization has ${OrganizationCapability.AdministrateOrganization} and we remove its capabilities`, async () => {
        requestContext.set(requestContextAdminUser);

        const anotherUserEmail = `testLastOrganizationAdministrator-anotherUser${uuidv4()}@${organizationName}.fr`;
        await UserProvisioningApp.autoProvisionNewUser({
          email: anotherUserEmail,
        });

        anotherUser = (await UserDomain.loadUserBy({
          'User.email': anotherUserEmail,
        }))!;

        const [anotherUserOrgRelation] =
          await UserOrganizationDomain.createUserOrganizationRelationAndRemovePending(
            {
              user_id: anotherUser.id,
              organizations_id: [organization.id],
            }
          );
        expect(anotherUserOrgRelation).toBeTruthy();

        await UserOrganizationCapabilityDomain.createUserOrganizationCapability(
          {
            user_organization_id: anotherUserOrgRelation!.id,
            capabilities_name: [
              OrganizationCapability.AdministrateOrganization,
            ],
          }
        );

        const result =
          await UserHelper.preventAdministratorRemovalOfOneOrganization(
            user.id,
            organization.id,
            []
          );

        expect(result).toBeUndefined();
      });
    });
  });

  describe('isUserLastOrganizationAdministrator', () => {
    it('should return false when user does not have administrator capability', async () => {
      const loadUserCapabilitiesByOrganizationSpy = vi
        .spyOn(UserDomain, 'loadUserCapabilitiesByOrganization')
        .mockResolvedValue({
          capabilities: [OrganizationCapability.ManageAccess],
        } as never);
      const countOrganizationAdministratorsSpy = vi.spyOn(
        UserOrganizationDomain,
        'countOrganizationAdministrators'
      );

      const result = await isUserLastOrganizationAdministrator(
        uuidv4() as UserId,
        uuidv4() as OrganizationId
      );

      expect(result).toBe(false);
      expect(countOrganizationAdministratorsSpy).not.toHaveBeenCalled();

      loadUserCapabilitiesByOrganizationSpy.mockRestore();
      countOrganizationAdministratorsSpy.mockRestore();
    });

    it('should log and return true when no administrator is found', async () => {
      const userId = uuidv4() as UserId;
      const organizationId = uuidv4() as OrganizationId;
      const loadUserCapabilitiesByOrganizationSpy = vi
        .spyOn(UserDomain, 'loadUserCapabilitiesByOrganization')
        .mockResolvedValue({
          capabilities: [OrganizationCapability.AdministrateOrganization],
        } as never);
      const countOrganizationAdministratorsSpy = vi
        .spyOn(UserOrganizationDomain, 'countOrganizationAdministrators')
        .mockResolvedValue(0);
      const logErrorSpy = vi.spyOn(logApp, 'error').mockImplementation(() => {
        return undefined as never;
      });

      const result = await isUserLastOrganizationAdministrator(
        userId,
        organizationId
      );

      expect(result).toBe(true);
      expect(logErrorSpy).toHaveBeenCalledWith(
        `Zero administrators found in the organization ${organizationId}`
      );

      loadUserCapabilitiesByOrganizationSpy.mockRestore();
      countOrganizationAdministratorsSpy.mockRestore();
      logErrorSpy.mockRestore();
    });
  });
});
