import { MockInstance } from '@vitest/spy';
import { toGlobalId } from 'graphql-relay/node/node';
import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../../tests/helper/test.helper';
import {
  requestContextAdminSecondOrga,
  // eslint-disable-next-line no-restricted-imports -- needed to test platform admin bypass behavior in editUser authorization
  requestContextAdminUser,
  requestContextSimpleUserFiligran2,
  requestContextSimpleUserSecondOrga,
  TEST_ORGANIZATIONS,
} from '../../../../../tests/tests.const';
import {
  DeploymentRequestHubStatus,
  FilterKey,
  OrganizationCapability,
  PlatformConfigurationStatus,
} from '../../../../__generated__/resolvers-types';
import { requestContext } from '../../../../context/request.context';
import { OrganizationId } from '../../../../model/kanel/public/Organization';
import User, { UserId } from '../../../../model/kanel/public/User';
import { UserLoadUserBy } from '../../../../model/user';
import {
  ADMIN_UUID,
  CRONS_USER_UUID,
  PLATFORM_ORGANIZATION_UUID,
  PLATFORM_USER_UUID,
  SYSTEM_USER_UUID,
} from '../../../../portal.const';
import * as pub from '../../../../pub';
import * as sessionStoreManager from '../../../../session-store-manager';
import { ErrorCode } from '../../../../utils/error/error.code';
import { OrganizationDomain } from '../../organization/organization.domain';
import { OrganizationHelper } from '../../organization/organization.helper';
import { UserDomain } from '../user-domain/user.domain';
import { UserOrganizationDomain } from '../user-organization/user-organization.domain';
import { UserOrganizationPendingDomain } from '../user-pending/user-organization-pending.domain';
import { UserProvisioningDomain } from '../user-provisioning/user-provisioning.domain';
import { UserTransferRequestDomain } from '../user-transferRequest/user-transfer-request.domain';
import { UserHelper } from '../user.helper';
import { UserAdminApp } from './user.admin.app';

describe('users admin app', () => {
  describe('editUser', () => {
    describe('authorization', () => {
      it('should reject a user without org capabilities', async () => {
        requestContext.set(requestContextSimpleUserSecondOrga);

        const call = UserAdminApp.editUser({
          userId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID,
          input: { organization_capabilities: [] },
        });

        await expect(call).rejects.toThrow(
          ErrorCode.MissingCapabilityOnOrganization
        );
      });

      it('should reject an org admin trying to edit a user from a different organization', async () => {
        requestContext.set(requestContextAdminSecondOrga);

        const call = UserAdminApp.editUser({
          userId: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE.ID,
          input: { organization_capabilities: [] },
        });

        await expect(call).rejects.toThrow(ErrorCode.UserIsNotInOrganization);
      });

      it('should reject an org admin trying to set capabilities on an organization they do not control', async () => {
        requestContext.set(requestContextAdminSecondOrga);

        const call = UserAdminApp.editUser({
          userId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID,
          input: {
            organization_capabilities: [
              {
                organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
                capabilities: [],
              },
              {
                organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
                capabilities: [OrganizationCapability.AdministrateOrganization],
              },
            ],
          },
        });

        await expect(call).rejects.toThrow(
          ErrorCode.MissingCapabilityOnOrganization
        );
      });

      it('should allow a platform admin to edit a user from any organization', async () => {
        requestContext.set(requestContextAdminUser);

        const call = UserAdminApp.editUser({
          userId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID,
          input: { organization_capabilities: [], first_name: 'Updated' },
        });

        await expect(call).rejects.not.toThrow(
          ErrorCode.UserIsNotInOrganization
        );
      });
    });

    describe('organization capabilities update', () => {
      let simpleUser: UserLoadUserBy;

      beforeEach(async () => {
        requestContext.set(requestContextAdminUser);
        simpleUser = (await UserDomain.loadUserBy({
          'User.id': TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE.ID,
        }))!;
      });

      afterEach(async () => {
        requestContext.set(requestContextAdminUser);
        await UserAdminApp.editUser({
          userId: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE.ID,
          input: {
            organization_capabilities: (
              simpleUser.organization_capabilities ?? []
            ).map((oc) => ({
              organization_id: oc.organization.id,
              capabilities: oc.capabilities,
            })),
          },
        });
      });

      it('should update organization_capabilities', async () => {
        await UserAdminApp.editUser({
          userId: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE.ID,
          input: {
            organization_capabilities: [
              {
                organization_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE
                  .ID as unknown as OrganizationId,
                capabilities: [
                  OrganizationCapability.ManageAccess,
                  OrganizationCapability.ManageSubscription,
                ],
              },
              {
                organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
                capabilities: [
                  OrganizationCapability.ManageAccess,
                  OrganizationCapability.ManageSubscription,
                ],
              },
              {
                organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
                capabilities: [],
              },
            ],
          },
        });
        const result = (await UserDomain.loadUserBy({
          'User.id': TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE.ID,
        }))!;
        expect(result.organization_capabilities).toHaveLength(3);
      });

      it('should not update other user fields', async () => {
        const result = await UserAdminApp.editUser({
          userId: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE.ID,
          input: {
            organization_capabilities: [
              {
                organization_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE
                  .ID as unknown as OrganizationId,
                capabilities: [
                  OrganizationCapability.ManageAccess,
                  OrganizationCapability.ManageSubscription,
                ],
              },
              {
                organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
                capabilities: [
                  OrganizationCapability.ManageAccess,
                  OrganizationCapability.ManageSubscription,
                ],
              },
            ],
          },
        });

        expect(result.first_name).toBe(simpleUser.first_name);
        expect(result.email).toBe(simpleUser.email);
      });
    });

    describe('last administrator protection', () => {
      it('should prevent deletion of the last organization administrator', async () => {
        requestContext.set(requestContextAdminUser);

        const call = UserAdminApp.editUser({
          userId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID,
          input: {
            organization_capabilities: [
              {
                organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
                capabilities: [],
              },
            ],
          },
        });

        await expect(call).rejects.toThrow(
          ErrorCode.CantRemoveLastAdministrator
        );
      });
    });
  });

  describe('pending request cleanup', () => {
    const email = 'testPendingCleanup@second-orga.com';
    let createdUser: User;

    beforeEach(async () => {
      requestContext.set(requestContextAdminSecondOrga);
      const secondOrga = (await OrganizationDomain.loadOrganizationBy({
        id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      }))!;
      createdUser = await UserHelper.createNewUserWithPendingOrga(
        { email, first_name: 'pending', last_name: 'cleanup', picture: null },
        secondOrga
      );
    });

    afterEach(async () => {
      vi.restoreAllMocks();
      await UserHelper.removeUser({ email });
    });

    it('should remove the pending request when an admin adds the user directly to the organization', async () => {
      const pendingBefore =
        await UserOrganizationPendingDomain.loadUserOrganizationPending({
          user_id: createdUser.id,
          organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        });
      expect(pendingBefore).toHaveLength(1);

      await UserAdminApp.addUser({
        email,
        organization_capabilities: [
          {
            organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
            capabilities: [],
          },
        ],
      });

      const pendingAfter =
        await UserOrganizationPendingDomain.loadUserOrganizationPending({
          user_id: createdUser.id,
          organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        });
      expect(pendingAfter).toHaveLength(0);
    });

    it('should remove the pending request when an admin edits the user into the organization', async () => {
      requestContext.set(requestContextAdminUser);

      const pendingBefore =
        await UserOrganizationPendingDomain.loadUserOrganizationPending({
          user_id: createdUser.id,
          organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        });
      expect(pendingBefore).toHaveLength(1);

      await UserAdminApp.editUser({
        userId: createdUser.id,
        input: {
          organization_capabilities: [
            {
              organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
              capabilities: [],
            },
          ],
        },
      });

      const pendingAfter =
        await UserOrganizationPendingDomain.loadUserOrganizationPending({
          user_id: createdUser.id,
          organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        });
      expect(pendingAfter).toHaveLength(0);
    });

    it('should not notify the deletion when the transaction rolls back', async () => {
      const dispatchSpy = vi.spyOn(UserHelper, 'dispatchPendingDeleted');
      vi.spyOn(UserDomain, 'loadUserBy').mockRejectedValueOnce(
        new Error('boom')
      );

      const call = UserAdminApp.addUser({
        email,
        organization_capabilities: [
          {
            organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
            capabilities: [],
          },
        ],
      });

      await expect(call).rejects.toThrow('boom');
      expect(dispatchSpy).not.toHaveBeenCalled();

      // the pending request must survive the rollback
      const pendingAfter =
        await UserOrganizationPendingDomain.loadUserOrganizationPending({
          user_id: createdUser.id,
          organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        });
      expect(pendingAfter).toHaveLength(1);
    });
  });

  describe('bulkAcceptPendingUserInOrganization', () => {
    let createdUsers: User[];
    let mockAcceptPendingUser: MockInstance<
      typeof UserHelper.acceptPendingUserWithCapabilities
    >;
    beforeEach(async () => {
      requestContext.set(requestContextAdminSecondOrga);
      createdUsers = [];
      mockAcceptPendingUser = vi.spyOn(
        UserHelper,
        'acceptPendingUserWithCapabilities'
      );
      const userList = [
        {
          email: 'testOne@second-orga.com',
          first_name: 'test',
          last_name: 'one',
          picture: null,
        },
        {
          email: 'testTwo@second-orga.com',
          first_name: 'test',
          last_name: 'two',
          picture: null,
        },
      ];
      const secondOrga = (await OrganizationDomain.loadOrganizationBy({
        id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      }))!;

      createdUsers = await Promise.all(
        userList.map((user) =>
          UserHelper.createNewUserWithPendingOrga(user, secondOrga)
        )
      );

      const filigranOrga = (await OrganizationDomain.loadOrganizationBy({
        id: TEST_ORGANIZATIONS.FILIGRAN.ID,
      }))!;
      const filigranUser = await UserHelper.createNewUserWithPendingOrga(
        {
          email: 'testFiligran@filigran.io',
          first_name: 'test',
          last_name: 'filigran',
          picture: null,
        },
        filigranOrga
      );
      createdUsers.push(filigranUser);
    });

    afterEach(async () => {
      await Promise.all(
        createdUsers.map((user) => UserHelper.removeUser({ email: user.email }))
      );
      vi.clearAllMocks();
    });

    it('should throw if user is not allowed on orga', async () => {
      const userToRemove = createdUsers[0];

      const call = UserAdminApp.bulkAcceptPendingUserInOrganization(
        TEST_ORGANIZATIONS.FILIGRAN.ID,
        [userToRemove!.id],
        undefined,
        [],
        []
      );
      await expect(call).rejects.toThrow(
        ErrorCode.MissingCapabilityOnOrganization
      );
    });
    it('should accept users by id', async () => {
      const userToRemove = createdUsers[0];
      await UserAdminApp.bulkAcceptPendingUserInOrganization(
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        [userToRemove!.id],
        undefined,
        [],
        []
      );

      expect(mockAcceptPendingUser).toHaveBeenCalledExactlyOnceWith({
        user_id: userToRemove!.id,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        orgCapabilities: [],
      });
    });

    it('should accept users by filter', async () => {
      await UserAdminApp.bulkAcceptPendingUserInOrganization(
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        [],
        undefined,
        [
          {
            key: FilterKey.OrganizationId,
            value: [
              toGlobalId(
                'Organization',
                TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
              ),
            ],
          },
        ],
        []
      );

      expect(mockAcceptPendingUser).toHaveBeenCalledWith({
        user_id: createdUsers[0]!.id,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        orgCapabilities: [],
      });
      expect(mockAcceptPendingUser).toHaveBeenCalledWith({
        user_id: createdUsers[1]!.id,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        orgCapabilities: [],
      });
    });
    it('should accept users by filters and excludedIds', async () => {
      const excludedUser = createdUsers[0];

      await UserAdminApp.bulkAcceptPendingUserInOrganization(
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        [],
        undefined,
        [
          {
            key: FilterKey.OrganizationId,
            value: [
              toGlobalId(
                'Organization',
                TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
              ),
            ],
          },
        ],
        [excludedUser!.id]
      );

      expect(mockAcceptPendingUser).toHaveBeenCalledExactlyOnceWith({
        user_id: createdUsers[1]!.id,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        orgCapabilities: [],
      });
    });
    it('should accept users by searchTerm', async () => {
      const acceptedUser = createdUsers.find(
        (user) => user.email === 'testOne@second-orga.com'
      );

      await UserAdminApp.bulkAcceptPendingUserInOrganization(
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        [],
        'One',
        [],
        []
      );

      expect(mockAcceptPendingUser).toHaveBeenCalledExactlyOnceWith({
        user_id: acceptedUser!.id,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        orgCapabilities: [],
      });
    });

    it('should accept users by searchTerm and excludedIds', async () => {
      const acceptedUser = createdUsers.find(
        (user) => user.email === 'testTwo@second-orga.com'
      );
      const nonAcceptedUser = createdUsers.find(
        (user) => user.email === 'testOne@second-orga.com'
      );

      await UserAdminApp.bulkAcceptPendingUserInOrganization(
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        [],
        'test',
        [],
        [nonAcceptedUser!.id]
      );

      expect(mockAcceptPendingUser).toHaveBeenCalledExactlyOnceWith({
        user_id: acceptedUser!.id,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        orgCapabilities: [],
      });
    });

    it('should accept users by filter, searchTerm and excludedIds', async () => {
      const acceptedUser = createdUsers.find(
        (user) => user.email === 'testTwo@second-orga.com'
      );
      const nonAcceptedUser = createdUsers.find(
        (user) => user.email === 'testOne@second-orga.com'
      );
      await UserAdminApp.bulkAcceptPendingUserInOrganization(
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        [],
        'test',
        [
          {
            key: FilterKey.OrganizationId,
            value: [
              toGlobalId(
                'Organization',
                TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
              ),
            ],
          },
        ],
        [nonAcceptedUser!.id]
      );

      expect(mockAcceptPendingUser).toHaveBeenCalledExactlyOnceWith({
        user_id: acceptedUser!.id,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        orgCapabilities: [],
      });
    });
    it('should accept only users from the specified organization', async () => {
      requestContext.set(requestContextAdminUser);
      const acceptedUser = createdUsers.find(
        (user) => user.email === 'testFiligran@filigran.io'
      );

      await UserAdminApp.bulkAcceptPendingUserInOrganization(
        TEST_ORGANIZATIONS.FILIGRAN.ID,
        [],
        undefined,
        [],
        []
      );

      expect(mockAcceptPendingUser).toHaveBeenCalledExactlyOnceWith({
        user_id: acceptedUser!.id,
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        orgCapabilities: [],
      });
    });
  });
  describe('bulkRemovePendingUserFromOrganization', () => {
    let createdUsers: User[];
    beforeEach(async () => {
      createdUsers = [];
      const filigranOrga = (await OrganizationDomain.loadOrganizationBy({
        id: TEST_ORGANIZATIONS.FILIGRAN.ID,
      }))!;
      const filigranUser = await UserHelper.createNewUserWithPendingOrga(
        {
          email: 'testFiligranRemoveBulk@filigran.io',
          first_name: 'test',
          last_name: 'filigran',
          picture: null,
        },
        filigranOrga
      );
      createdUsers.push(filigranUser);
    });

    afterEach(async () => {
      await Promise.all(
        createdUsers.map((user) => UserHelper.removeUser({ email: user.email }))
      );
    });
    it('should throw if user is not allowed on orga', async () => {
      requestContext.set(requestContextAdminSecondOrga);
      const filigranOrga = (await OrganizationDomain.loadOrganizationBy({
        id: TEST_ORGANIZATIONS.FILIGRAN.ID,
      }))!;
      const filigranUser = await UserHelper.createNewUserWithPendingOrga(
        {
          email: 'testFiligran@filigran.io',
          first_name: 'test',
          last_name: 'filigran',
          picture: null,
        },
        filigranOrga
      );

      const call = UserAdminApp.bulkRemovePendingUserFromOrganization(
        TEST_ORGANIZATIONS.FILIGRAN.ID,
        [filigranUser!.id],
        undefined,
        [],
        []
      );
      await expect(call).rejects.toThrow(
        ErrorCode.MissingCapabilityOnOrganization
      );
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      requestContext.set(requestContextSimpleUserFiligran2);
    });

    describe('success', () => {
      it('should delete the user and its personal space organization', async () => {
        const user = await UserProvisioningDomain.createUser(
          { email: `delete-user-${uuidv4()}@delete-user-test.io` },
          { sendWelcomeEmail: false }
        );

        const deletedUser = await UserAdminApp.deleteUser(user.id);

        expect(deletedUser.id).toBe(user.id);
        expect(await UserDomain.loadUser({ id: user.id })).toEqual([]);
        expect(
          await TestHelper.organization.load({
            id: OrganizationHelper.personalSpaceIdOf(user),
          })
        ).toBeUndefined();
      });

      describe('with a non personal organization shared by two users', () => {
        let user: User;
        let otherUser: User;
        let organization: Awaited<
          ReturnType<typeof TestHelper.organization.create>
        >;

        beforeEach(async () => {
          user = await UserProvisioningDomain.createUser(
            { email: `delete-user-${uuidv4()}@delete-user-test.io` },
            { sendWelcomeEmail: false }
          );
          otherUser = await UserProvisioningDomain.createUser(
            { email: `delete-user-${uuidv4()}@delete-user-test.io` },
            { sendWelcomeEmail: false }
          );
          organization = await TestHelper.organization.create({
            personal_space: false,
          });
          await TestHelper.user_Organization.create({
            user_id: user.id,
            organization_id: organization.id,
          });
          await TestHelper.user_Organization.create({
            user_id: otherUser.id,
            organization_id: organization.id,
          });
        });

        it('should keep a non personal organization and only remove the membership', async () => {
          await UserAdminApp.deleteUser(user.id);

          expect(
            await TestHelper.organization.load({ id: organization.id })
          ).toBeDefined();
          expect(
            await UserOrganizationDomain.countUsersInOrganization(
              organization.id
            )
          ).toBe(1);
        });

        it('should cascade delete the organization capabilities granted to the user', async () => {
          const userOrganization =
            await UserOrganizationDomain.loadUserOrganization({
              user_id: user.id,
              organization_id: organization.id,
            });
          await TestHelper.user_OrganizationCapability.create({
            user_organization_id: userOrganization[0]!.id,
            name: OrganizationCapability.ManageAccess,
          });

          await UserAdminApp.deleteUser(user.id);

          expect(
            await TestHelper.user_OrganizationCapability.loadAll({
              user_organization_id: userOrganization[0]!.id,
            })
          ).toEqual([]);
        });
      });

      it('should cascade delete the RolePortal assignments of the user', async () => {
        const user = await UserProvisioningDomain.createUser(
          { email: `delete-user-${uuidv4()}@delete-user-test.io` },
          { sendWelcomeEmail: false }
        );
        const rolePortal = await TestHelper.rolePortal.create({
          name: `delete-user-role-${uuidv4()}`,
        });
        await TestHelper.user_RolePortal.create({
          user_id: user.id,
          role_portal_id: rolePortal!.id,
        });

        await UserAdminApp.deleteUser(user.id);

        expect(
          await TestHelper.user_RolePortal.loadAll({ user_id: user.id })
        ).toEqual([]);
      });

      it('should cascade delete the service capabilities granted through the user service subscription', async () => {
        const user = await UserProvisioningDomain.createUser(
          { email: `delete-user-${uuidv4()}@delete-user-test.io` },
          { sendWelcomeEmail: false }
        );
        const serviceInstance = await TestHelper.serviceInstance.create();
        const subscription = await TestHelper.subscription.create({
          organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
          service_instance_id: serviceInstance.id,
        });
        const userService = await TestHelper.user_Service.create({
          user_id: user.id,
          subscription_id: subscription.id,
        });
        await TestHelper.user_ServiceCapability.create({
          user_service_id: userService!.id,
        });

        await UserAdminApp.deleteUser(user.id);

        expect(
          await TestHelper.user_ServiceCapability.loadAll({
            user_service_id: userService!.id,
          })
        ).toEqual([]);

        await TestHelper.subscription.delete({ id: subscription.id });
        await TestHelper.serviceInstance.delete({ id: serviceInstance.id });
      });

      it('should cascade delete the ServiceGroup membership of the user', async () => {
        const user = await UserProvisioningDomain.createUser(
          { email: `delete-user-${uuidv4()}@delete-user-test.io` },
          { sendWelcomeEmail: false }
        );
        const serviceInstance = await TestHelper.serviceInstance.create();
        const serviceGroup = await TestHelper.serviceGroup.create({
          service_instance_id: serviceInstance.id,
        });
        await TestHelper.serviceGroupUser.create({
          group_id: serviceGroup.id,
          user_id: user.id,
        });

        await UserAdminApp.deleteUser(user.id);

        expect(
          await TestHelper.serviceGroupUser.load({ user_id: user.id })
        ).toEqual([]);

        await TestHelper.serviceGroup.delete({ id: serviceGroup.id });
        await TestHelper.serviceInstance.delete({ id: serviceInstance.id });
      });

      it('should set user_id to null on the OneClickDeployment rows of the deleted user', async () => {
        const user = await UserProvisioningDomain.createUser(
          { email: `delete-user-${uuidv4()}@delete-user-test.io` },
          { sendWelcomeEmail: false }
        );
        const oneClickDeployment = await TestHelper.oneClickDeployment.insert({
          resource_id: uuidv4(),
          user_id: user.id,
        });

        await UserAdminApp.deleteUser(user.id);

        expect(await UserDomain.loadUser({ id: user.id })).toEqual([]);
        const remainingDeployments =
          await TestHelper.oneClickDeployment.loadAll({
            resource_id: oneClickDeployment.resource_id,
          });
        expect(remainingDeployments).toHaveLength(1);
        expect(remainingDeployments[0]).toMatchObject({
          resource_id: oneClickDeployment.resource_id,
          user_id: null,
        });

        await TestHelper.oneClickDeployment.deleteAll();
      });

      it('should reassign the documents of the user to the system user', async () => {
        const user = await UserProvisioningDomain.createUser(
          { email: `delete-user-${uuidv4()}@delete-user-test.io` },
          { sendWelcomeEmail: false }
        );
        const uploaded = await TestHelper.document.create({
          uploader_id: user.id,
          uploader_organization_id: OrganizationHelper.personalSpaceIdOf(user),
        });
        const touched = await TestHelper.document.create({
          uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
          remover_id: user.id,
          updater_id: user.id,
        });

        await UserAdminApp.deleteUser(user.id);

        expect(
          await TestHelper.document.load({ id: uploaded.id })
        ).toMatchObject({
          uploader_id: SYSTEM_USER_UUID,
          uploader_organization_id: PLATFORM_ORGANIZATION_UUID,
        });
        expect(
          await TestHelper.document.load({ id: touched.id })
        ).toMatchObject({
          remover_id: SYSTEM_USER_UUID,
          updater_id: SYSTEM_USER_UUID,
        });

        await TestHelper.document.delete({ id: uploaded.id });
        await TestHelper.document.delete({ id: touched.id });
      });

      it('should reassign the epics of the user to the system user', async () => {
        const user = await UserProvisioningDomain.createUser(
          { email: `delete-user-${uuidv4()}@delete-user-test.io` },
          { sendWelcomeEmail: false }
        );
        const epic = await TestHelper.epic.create({
          uploader_id: user.id,
          updater_id: user.id,
        });

        await UserAdminApp.deleteUser(user.id);

        expect(await TestHelper.epic.load({ id: epic!.id })).toMatchObject({
          uploader_id: SYSTEM_USER_UUID,
          updater_id: SYSTEM_USER_UUID,
        });

        await TestHelper.epic.delete({ id: epic!.id });
      });

      it('should destroy the sessions of the deleted user', async () => {
        const destroySpy = vi
          .spyOn(sessionStoreManager, 'destroyUserSessions')
          .mockResolvedValue(undefined);
        const user = await UserProvisioningDomain.createUser(
          { email: `delete-user-${uuidv4()}@delete-user-test.io` },
          { sendWelcomeEmail: false }
        );

        await UserAdminApp.deleteUser(user.id);

        expect(destroySpy).toHaveBeenCalledWith(user.id);
      });

      it('should delete the picture of the deleted user', async () => {
        const deletePictureSpy = vi.spyOn(UserHelper, 'deleteUserPicture');
        const user = await UserProvisioningDomain.createUser(
          { email: `delete-user-${uuidv4()}@delete-user-test.io` },
          { sendWelcomeEmail: false }
        );

        await UserAdminApp.deleteUser(user.id);

        expect(deletePictureSpy).toHaveBeenCalledWith(user.picture_minio);
      });

      it('should dispatch a delete event for the user and its personal space', async () => {
        const dispatchSpy = vi.spyOn(pub, 'dispatch');
        const user = await UserProvisioningDomain.createUser(
          { email: `delete-user-${uuidv4()}@delete-user-test.io` },
          { sendWelcomeEmail: false }
        );

        await UserAdminApp.deleteUser(user.id);

        expect(dispatchSpy).toHaveBeenCalledWith(
          'User',
          'delete',
          expect.objectContaining({ id: user.id })
        );
        expect(dispatchSpy).toHaveBeenCalledWith(
          'MeUser',
          'delete',
          expect.objectContaining({ id: user.id }),
          'User'
        );
        expect(dispatchSpy).toHaveBeenCalledWith(
          'Organization',
          'delete',
          expect.objectContaining({
            id: OrganizationHelper.personalSpaceIdOf(user),
          })
        );
      });

      it('should not fail the deletion when dispatching the delete events throws', async () => {
        const dispatchSpy = vi
          .spyOn(pub, 'dispatch')
          .mockRejectedValueOnce(new Error('subscriber unavailable'));
        const user = await UserProvisioningDomain.createUser(
          { email: `delete-user-${uuidv4()}@delete-user-test.io` },
          { sendWelcomeEmail: false }
        );

        const deletedUser = await UserAdminApp.deleteUser(user.id);

        expect(deletedUser.id).toBe(user.id);
        expect(await UserDomain.loadUser({ id: user.id })).toEqual([]);
        expect(dispatchSpy).toHaveBeenCalled();
      });
    });

    describe('guards', () => {
      it('should map foreign key violations to a blocked-by-linked-data error', async () => {
        const user = await UserProvisioningDomain.createUser(
          { email: `delete-user-${uuidv4()}@delete-user-test.io` },
          { sendWelcomeEmail: false }
        );
        const deleteUserBySpy = vi
          .spyOn(UserDomain, 'deleteUserBy')
          .mockRejectedValueOnce({ code: '23503' } as never);

        await expect(UserAdminApp.deleteUser(user.id)).rejects.toThrow(
          ErrorCode.DeleteUserBlockedByLinkedData
        );
        expect(await UserDomain.loadUser({ id: user.id })).toHaveLength(1);

        deleteUserBySpy.mockRestore();
        await UserHelper.removeUser({ id: user.id });
      });

      it('should reject an unknown user', async () => {
        await expect(
          UserAdminApp.deleteUser(uuidv4() as UserId)
        ).rejects.toThrow(ErrorCode.UserNotFound);
      });

      it('should reject the deletion of the requesting user', async () => {
        await expect(
          UserAdminApp.deleteUser(TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID)
        ).rejects.toThrow(ErrorCode.CantDeleteYourself);
      });

      it.each`
        builtinUserId         | description
        ${ADMIN_UUID}         | ${'the platform administrator'}
        ${SYSTEM_USER_UUID}   | ${'the system user'}
        ${PLATFORM_USER_UUID} | ${'the platform user'}
        ${CRONS_USER_UUID}    | ${'the crons user'}
      `(
        'should reject the deletion of $description',
        async ({ builtinUserId }) => {
          await expect(UserAdminApp.deleteUser(builtinUserId)).rejects.toThrow(
            ErrorCode.CantDeleteBuiltinUser
          );
        }
      );

      it.each`
        direction      | description
        ${'from_user'} | ${'the user initiated the transfer'}
        ${'to_user'}   | ${'the user is the transfer target'}
      `(
        'should reject when a transfer request exists and $description',
        async ({ direction }) => {
          const user = await UserProvisioningDomain.createUser(
            { email: `delete-user-${uuidv4()}@delete-user-test.io` },
            { sendWelcomeEmail: false }
          );
          const counterpart = await UserProvisioningDomain.createUser(
            { email: `delete-user-${uuidv4()}@delete-user-test.io` },
            { sendWelcomeEmail: false }
          );
          await UserTransferRequestDomain.insertNewUserTransfer(
            direction === 'from_user'
              ? { from_user_id: user.id, to_user_id: counterpart.id }
              : { from_user_id: counterpart.id, to_user_id: user.id }
          );

          await expect(UserAdminApp.deleteUser(user.id)).rejects.toThrow(
            ErrorCode.DeleteUserBlockedByTransferRequest
          );

          expect(await UserDomain.loadUser({ id: user.id })).toHaveLength(1);
          expect(
            await TestHelper.organization.load({
              id: OrganizationHelper.personalSpaceIdOf(user),
            })
          ).toBeDefined();
        }
      );

      it.each`
        hubStatus
        ${DeploymentRequestHubStatus.Queued}
        ${DeploymentRequestHubStatus.Pending}
        ${DeploymentRequestHubStatus.Provisioning}
        ${DeploymentRequestHubStatus.Active}
        ${DeploymentRequestHubStatus.Expired}
        ${DeploymentRequestHubStatus.Failed}
        ${DeploymentRequestHubStatus.Cancelled}
      `(
        'should reject when a $hubStatus deployment request references the user',
        async ({ hubStatus }) => {
          const user = await UserProvisioningDomain.createUser(
            { email: `delete-user-${uuidv4()}@delete-user-test.io` },
            { sendWelcomeEmail: false }
          );
          await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
            {
              user_requester_id: user.id,
              organization_requester_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
              hub_status: hubStatus,
            }
          );

          await expect(UserAdminApp.deleteUser(user.id)).rejects.toThrow(
            ErrorCode.DeleteUserBlockedByDeploymentRequest
          );

          expect(await UserDomain.loadUser({ id: user.id })).toHaveLength(1);
        }
      );

      it('should reject when the user cancelled a deployment request on behalf of someone else', async () => {
        const user = await UserProvisioningDomain.createUser(
          { email: `delete-user-${uuidv4()}@delete-user-test.io` },
          { sendWelcomeEmail: false }
        );
        const requester = await UserProvisioningDomain.createUser(
          { email: `delete-user-${uuidv4()}@delete-user-test.io` },
          { sendWelcomeEmail: false }
        );
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            user_requester_id: requester.id,
            organization_requester_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
            hub_status: DeploymentRequestHubStatus.Cancelled,
            cancellation_user_id: user.id,
          }
        );

        await expect(UserAdminApp.deleteUser(user.id)).rejects.toThrow(
          ErrorCode.DeleteUserBlockedByCancellationRecord
        );

        expect(await UserDomain.loadUser({ id: user.id })).toHaveLength(1);
      });

      it.each`
        status                                  | description
        ${PlatformConfigurationStatus.Active}   | ${'an active platform'}
        ${PlatformConfigurationStatus.Inactive} | ${'an inactive platform'}
      `(
        'should reject when the user registered $description',
        async ({ status }) => {
          const user = await UserProvisioningDomain.createUser(
            { email: `delete-user-${uuidv4()}@delete-user-test.io` },
            { sendWelcomeEmail: false }
          );
          const serviceInstance = await TestHelper.serviceInstance.create();
          await TestHelper.platformConfiguration.create({
            service_instance_id: serviceInstance.id,
            registerer_id: user.id,
            status,
          });

          await expect(UserAdminApp.deleteUser(user.id)).rejects.toThrow(
            ErrorCode.DeleteUserBlockedByPlatformRegistration
          );

          expect(await UserDomain.loadUser({ id: user.id })).toHaveLength(1);
          expect(
            await TestHelper.organization.load({
              id: OrganizationHelper.personalSpaceIdOf(user),
            })
          ).toBeDefined();
        }
      );

      it('should reject when the user is the last member of a non personal organization', async () => {
        const user = await UserProvisioningDomain.createUser(
          { email: `delete-user-${uuidv4()}@delete-user-test.io` },
          { sendWelcomeEmail: false }
        );
        const organization = await TestHelper.organization.create({
          personal_space: false,
        });
        await TestHelper.user_Organization.create({
          user_id: user.id,
          organization_id: organization.id,
        });

        await expect(UserAdminApp.deleteUser(user.id)).rejects.toThrow(
          ErrorCode.DeleteUserBlockedByLastOrganizationMember
        );

        expect(await UserDomain.loadUser({ id: user.id })).toHaveLength(1);
        expect(
          await TestHelper.organization.load({ id: organization.id })
        ).toBeDefined();
        expect(
          await TestHelper.organization.load({
            id: OrganizationHelper.personalSpaceIdOf(user),
          })
        ).toBeDefined();
      });

      describe('with a non personal organization shared by two users', () => {
        let user: User;
        let otherUser: User;
        let organization: Awaited<
          ReturnType<typeof TestHelper.organization.create>
        >;

        beforeEach(async () => {
          user = await UserProvisioningDomain.createUser(
            { email: `delete-user-${uuidv4()}@delete-user-test.io` },
            { sendWelcomeEmail: false }
          );
          otherUser = await UserProvisioningDomain.createUser(
            { email: `delete-user-${uuidv4()}@delete-user-test.io` },
            { sendWelcomeEmail: false }
          );
          organization = await TestHelper.organization.create({
            personal_space: false,
          });
          await TestHelper.user_Organization.create({
            user_id: user.id,
            organization_id: organization.id,
          });
          await TestHelper.user_Organization.create({
            user_id: otherUser.id,
            organization_id: organization.id,
          });
        });

        it('should reject when the user is the last administrator of a non personal organization', async () => {
          const userOrganization = await TestHelper.user_Organization.load({
            user_id: user.id,
            organization_id: organization.id,
          });
          await TestHelper.user_OrganizationCapability.create({
            user_organization_id: userOrganization.id,
            name: OrganizationCapability.AdministrateOrganization,
          });

          await expect(UserAdminApp.deleteUser(user.id)).rejects.toThrow(
            ErrorCode.CantRemoveLastAdministrator
          );

          expect(await UserDomain.loadUser({ id: user.id })).toHaveLength(1);
          expect(
            await TestHelper.organization.load({ id: organization.id })
          ).toBeDefined();
        });

        it('should allow deletion when another administrator remains in the organization', async () => {
          const userOrganization = await TestHelper.user_Organization.load({
            user_id: user.id,
            organization_id: organization.id,
          });
          await TestHelper.user_OrganizationCapability.create({
            user_organization_id: userOrganization.id,
            name: OrganizationCapability.AdministrateOrganization,
          });
          const otherUserOrganization = await TestHelper.user_Organization.load(
            {
              user_id: otherUser.id,
              organization_id: organization.id,
            }
          );
          await TestHelper.user_OrganizationCapability.create({
            user_organization_id: otherUserOrganization.id,
            name: OrganizationCapability.AdministrateOrganization,
          });

          await expect(UserAdminApp.deleteUser(user.id)).resolves.toMatchObject(
            {
              id: user.id,
            }
          );
        });
      });

      it('should reject when the personal space organization has pending users', async () => {
        const user = await UserProvisioningDomain.createUser(
          { email: `delete-user-${uuidv4()}@delete-user-test.io` },
          { sendWelcomeEmail: false }
        );
        const pendingUser = await UserProvisioningDomain.createUser(
          { email: `delete-user-${uuidv4()}@delete-user-test.io` },
          { sendWelcomeEmail: false }
        );
        await UserOrganizationPendingDomain.insertNewUserOrganizationPending({
          user_id: pendingUser.id,
          organization_id: OrganizationHelper.personalSpaceIdOf(user),
        });

        await expect(UserAdminApp.deleteUser(user.id)).rejects.toThrow(
          ErrorCode.DeleteUserBlockedByPendingUsers
        );

        expect(await UserDomain.loadUser({ id: user.id })).toHaveLength(1);
      });

      it('should not reassign the documents when the deletion is blocked', async () => {
        const user = await UserProvisioningDomain.createUser(
          { email: `delete-user-${uuidv4()}@delete-user-test.io` },
          { sendWelcomeEmail: false }
        );
        const counterpart = await UserProvisioningDomain.createUser(
          { email: `delete-user-${uuidv4()}@delete-user-test.io` },
          { sendWelcomeEmail: false }
        );
        const document = await TestHelper.document.create({
          uploader_id: user.id,
        });
        await UserTransferRequestDomain.insertNewUserTransfer({
          from_user_id: user.id,
          to_user_id: counterpart.id,
        });

        await expect(UserAdminApp.deleteUser(user.id)).rejects.toThrow(
          ErrorCode.DeleteUserBlockedByTransferRequest
        );

        expect(
          await TestHelper.document.load({ id: document.id })
        ).toMatchObject({ uploader_id: user.id });

        await TestHelper.document.delete({ id: document.id });
      });
    });
  });
});
