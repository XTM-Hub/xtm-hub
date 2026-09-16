import { v4 as uuidv4 } from 'uuid';
import { describe, expect, it } from 'vitest';
import { TestHelper } from '../../../../../tests/helper/test.helper';
import {
  // eslint-disable-next-line no-restricted-imports
  requestContextAdminUser,
  SERVICES,
  TEST_ORGANIZATIONS,
} from '../../../../../tests/tests.const';
import { requestContext } from '../../../../context/request.context';
import { ForbiddenErrorCode } from '../../../../utils/error/error.code';
import { UserOrganizationPendingDomain } from '../user-pending/user-organization-pending.domain';
import { UserProvisioningDomain } from '../user-provisioning/user-provisioning.domain';
import { UserOrganizationDomain } from './user-organization.domain';

describe('userOrganizationDomain', () => {
  describe('createUserOrganizationRelationAndRemovePending', () => {
    it('should delete pending organization before adding an organization', async () => {
      const testMail = `createUserOrganizationRelationAndRemovePending${uuidv4()}@filigran.io`;
      const user = await TestHelper.user.insertWithPendingOrganization(
        { email: testMail },
        TEST_ORGANIZATIONS.FILIGRAN.ID
      );
      const initialPendingOrg =
        await UserOrganizationPendingDomain.loadUserOrganizationPending({
          user_id: user.id,
        });
      expect(initialPendingOrg).toHaveLength(1);

      const user_orgs =
        await UserOrganizationDomain.createUserOrganizationRelationAndRemovePending(
          {
            user_id: user.id,
            organizations_id: [TEST_ORGANIZATIONS.FILIGRAN.ID],
          }
        );

      expect(user_orgs).toHaveLength(1);
      const finalPendingOrg =
        await UserOrganizationPendingDomain.loadUserOrganizationPending({
          user_id: user.id,
        });
      expect(finalPendingOrg).toHaveLength(0);
    });

    it('should not fail if there is no organization to remove', async () => {
      const testMail = `createUserOrganizationRelationAndRemovePending${uuidv4()}@whatever.io`;
      const user = await TestHelper.user.insert({ email: testMail });
      const initialPendingOrg =
        await UserOrganizationPendingDomain.loadUserOrganizationPending({
          user_id: user.id,
        });
      expect(initialPendingOrg).toHaveLength(0);

      const user_orgs =
        await UserOrganizationDomain.createUserOrganizationRelationAndRemovePending(
          {
            user_id: user.id,
            organizations_id: [TEST_ORGANIZATIONS.FILIGRAN.ID],
          }
        );

      expect(user_orgs).toHaveLength(1);
    });
  });

  describe('countUsersInOrganization', () => {
    it('should count users linked to the organization, ignoring other organizations', async () => {
      const organization = await TestHelper.organization.create({
        personal_space: false,
      });
      const user1 = await UserProvisioningDomain.createUser(
        { email: `count-users-in-organization-${uuidv4()}@filigran.io` },
        { sendWelcomeEmail: false }
      );
      const user2 = await UserProvisioningDomain.createUser(
        { email: `count-users-in-organization-${uuidv4()}@filigran.io` },
        { sendWelcomeEmail: false }
      );

      expect(
        await UserOrganizationDomain.countUsersInOrganization(organization.id)
      ).toBe(0);

      await UserOrganizationDomain.createUserOrganizationRelation({
        user_id: user1.id,
        organizations_id: [organization.id],
      });
      await UserOrganizationDomain.createUserOrganizationRelation({
        user_id: user2.id,
        organizations_id: [TEST_ORGANIZATIONS.FILIGRAN.ID],
      });

      expect(
        await UserOrganizationDomain.countUsersInOrganization(organization.id)
      ).toBe(1);
    });
  });

  describe('areAllUsersInOrganization', () => {
    it('should return true when userIds is empty', async () => {
      const organization = await TestHelper.organization.create({
        personal_space: false,
      });

      expect(
        await UserOrganizationDomain.areAllUsersInOrganization(
          [],
          organization.id
        )
      ).toBe(true);
    });

    it('should return true when all users belong to the organization', async () => {
      const organization = await TestHelper.organization.create({
        personal_space: false,
      });
      const user1 = await UserProvisioningDomain.createUser(
        { email: `are-all-users-in-organization-${uuidv4()}@filigran.io` },
        { sendWelcomeEmail: false }
      );
      const user2 = await UserProvisioningDomain.createUser(
        { email: `are-all-users-in-organization-${uuidv4()}@filigran.io` },
        { sendWelcomeEmail: false }
      );
      await UserOrganizationDomain.createUserOrganizationRelation({
        user_id: user1.id,
        organizations_id: [organization.id],
      });
      await UserOrganizationDomain.createUserOrganizationRelation({
        user_id: user2.id,
        organizations_id: [organization.id],
      });

      expect(
        await UserOrganizationDomain.areAllUsersInOrganization(
          [user1.id, user2.id],
          organization.id
        )
      ).toBe(true);
    });

    it('should return false when one user does not belong to the organization', async () => {
      const organization = await TestHelper.organization.create({
        personal_space: false,
      });
      const user1 = await UserProvisioningDomain.createUser(
        { email: `are-all-users-in-organization-${uuidv4()}@filigran.io` },
        { sendWelcomeEmail: false }
      );
      const outsideUser = await UserProvisioningDomain.createUser(
        { email: `are-all-users-in-organization-${uuidv4()}@filigran.io` },
        { sendWelcomeEmail: false }
      );
      await UserOrganizationDomain.createUserOrganizationRelation({
        user_id: user1.id,
        organizations_id: [organization.id],
      });
      await UserOrganizationDomain.createUserOrganizationRelation({
        user_id: outsideUser.id,
        organizations_id: [TEST_ORGANIZATIONS.FILIGRAN.ID],
      });

      expect(
        await UserOrganizationDomain.areAllUsersInOrganization(
          [user1.id, outsideUser.id],
          organization.id
        )
      ).toBe(false);
    });

    it('should return false when a userId is not linked to any organization', async () => {
      const organization = await TestHelper.organization.create({
        personal_space: false,
      });

      expect(
        await UserOrganizationDomain.areAllUsersInOrganization(
          [uuidv4()],
          organization.id
        )
      ).toBe(false);
    });
  });

  describe('ensureUserOrganizationExists', () => {
    it('should create the User_Organization link when it does not exist yet', async () => {
      const organization = await TestHelper.organization.create({
        personal_space: false,
      });
      const user = await UserProvisioningDomain.createUser(
        { email: `ensure-user-org-${uuidv4()}@filigran.io` },
        { sendWelcomeEmail: false }
      );

      const result = await UserOrganizationDomain.ensureUserOrganizationExists(
        user.id,
        organization.id
      );

      const userOrg = await TestHelper.user_Organization.load({
        user_id: user.id,
        organization_id: organization.id,
      });
      expect(userOrg).toBeDefined();
      expect(result.id).toBe(userOrg!.id);
    });

    it('should return the existing link instead of creating a duplicate when called twice', async () => {
      const organization = await TestHelper.organization.create({
        personal_space: false,
      });
      const user = await UserProvisioningDomain.createUser(
        { email: `ensure-user-org-${uuidv4()}@filigran.io` },
        { sendWelcomeEmail: false }
      );

      const first = await UserOrganizationDomain.ensureUserOrganizationExists(
        user.id,
        organization.id
      );
      const second = await UserOrganizationDomain.ensureUserOrganizationExists(
        user.id,
        organization.id
      );

      expect(second.id).toBe(first.id);
    });
  });

  describe('isFirstInOrganization', () => {
    it('should return true when there is exactly one user in the organization', async () => {
      const organization = await TestHelper.organization.create({
        personal_space: false,
      });
      const user = await UserProvisioningDomain.createUser(
        { email: `is-first-in-org-${uuidv4()}@filigran.io` },
        { sendWelcomeEmail: false }
      );
      await UserOrganizationDomain.createUserOrganizationRelation({
        user_id: user.id,
        organizations_id: [organization.id],
      });

      expect(
        await UserOrganizationDomain.isFirstInOrganization(organization.id)
      ).toBe(true);
    });

    it('should return false when there are two or more users in the organization', async () => {
      const organization = await TestHelper.organization.create({
        personal_space: false,
      });
      const user1 = await UserProvisioningDomain.createUser(
        { email: `is-first-in-org-${uuidv4()}@filigran.io` },
        { sendWelcomeEmail: false }
      );
      const user2 = await UserProvisioningDomain.createUser(
        { email: `is-first-in-org-${uuidv4()}@filigran.io` },
        { sendWelcomeEmail: false }
      );
      await UserOrganizationDomain.createUserOrganizationRelation({
        user_id: user1.id,
        organizations_id: [organization.id],
      });
      await UserOrganizationDomain.createUserOrganizationRelation({
        user_id: user2.id,
        organizations_id: [organization.id],
      });

      expect(
        await UserOrganizationDomain.isFirstInOrganization(organization.id)
      ).toBe(false);
    });
  });

  describe('linkUserToSubscriptionOrganization', () => {
    it('should link the user to the organization and grant administrate capability when they are the first member', async () => {
      requestContext.set(requestContextAdminUser);
      const domain = `link-subscription-${uuidv4()}.io`;
      const organization = await TestHelper.organization.create({
        personal_space: false,
        domains: [domain],
      });
      const subscription = await TestHelper.subscription.create({
        organization_id: organization.id,
        service_instance_id: SERVICES.INSTANCES.VAULT.ID,
      });
      const user = await UserProvisioningDomain.createUser(
        { email: `user@${domain}` },
        { sendWelcomeEmail: false }
      );

      await UserOrganizationDomain.linkUserToSubscriptionOrganization(
        user,
        subscription.id
      );

      const userOrganization = await TestHelper.user_Organization.load({
        user_id: user.id,
        organization_id: organization.id,
      });
      expect(userOrganization).toBeTruthy();

      const capabilities = await TestHelper.user_OrganizationCapability.loadAll(
        { user_organization_id: userOrganization.id }
      );
      expect(capabilities.map((capability) => capability.name)).toEqual([
        'ADMINISTRATE_ORGANIZATION',
      ]);
    });

    it('should link a second user to the organization without granting administrate capability', async () => {
      const subscription = await TestHelper.subscription.create({
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: SERVICES.INSTANCES.VAULT.ID,
      });
      const user = await UserProvisioningDomain.createUser(
        {
          email: `second-${uuidv4()}@${TEST_ORGANIZATIONS.FILIGRAN.DOMAINS.FIRST}`,
        },
        { sendWelcomeEmail: false }
      );

      await UserOrganizationDomain.linkUserToSubscriptionOrganization(
        user,
        subscription.id
      );

      const userOrganization = await TestHelper.user_Organization.load({
        user_id: user.id,
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
      });
      expect(userOrganization).toBeTruthy();

      const capabilities = await TestHelper.user_OrganizationCapability.loadAll(
        { user_organization_id: userOrganization.id }
      );
      expect(capabilities).toHaveLength(0);
    });

    it('should throw a NotFoundError when no organization matches the user email domain', async () => {
      const organization = await TestHelper.organization.create({
        personal_space: false,
        domains: [`link-subscription-${uuidv4()}.io`],
      });
      const subscription = await TestHelper.subscription.create({
        organization_id: organization.id,
        service_instance_id: SERVICES.INSTANCES.VAULT.ID,
      });
      const user = await UserProvisioningDomain.createUser(
        { email: `orphan-${uuidv4()}@unmatched-domain.io` },
        { sendWelcomeEmail: false }
      );

      const call = UserOrganizationDomain.linkUserToSubscriptionOrganization(
        user,
        subscription.id
      );

      await expect(call).rejects.toThrow();
    });

    it('should throw a ForbiddenAccess error when the user email domain matches a different organization than the subscription', async () => {
      const subscriptionOrganization = await TestHelper.organization.create({
        personal_space: false,
        domains: [`link-subscription-${uuidv4()}.io`],
      });
      const subscription = await TestHelper.subscription.create({
        organization_id: subscriptionOrganization.id,
        service_instance_id: SERVICES.INSTANCES.VAULT.ID,
      });
      const user = await UserProvisioningDomain.createUser(
        {
          email: `mismatched-${uuidv4()}@${TEST_ORGANIZATIONS.FILIGRAN.DOMAINS.FIRST}`,
        },
        { sendWelcomeEmail: false }
      );

      const call = UserOrganizationDomain.linkUserToSubscriptionOrganization(
        user,
        subscription.id
      );

      await expect(call).rejects.toThrow(
        ForbiddenErrorCode.EmailOutsideOrganizationError
      );
    });
  });
});
