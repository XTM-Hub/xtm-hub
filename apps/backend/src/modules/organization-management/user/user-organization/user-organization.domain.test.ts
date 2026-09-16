import { v4 as uuidv4 } from 'uuid';
import { describe, expect, it } from 'vitest';
import { TestHelper } from '../../../../../tests/helper/test.helper';
import { TEST_ORGANIZATIONS } from '../../../../../tests/tests.const';
import { UserOrganizationPendingDomain } from '../user-pending/user-organization-pending.domain';
import { UserProvisioningApp } from '../user-provisioning/user-provisioning.app';
import { UserProvisioningDomain } from '../user-provisioning/user-provisioning.domain';
import { UserOrganizationDomain } from './user-organization.domain';

describe('userOrganizationDomain', () => {
  describe('createUserOrganizationRelationAndRemovePending', () => {
    it('should delete pending organization before adding an organization', async () => {
      const testMail = `createUserOrganizationRelationAndRemovePending${uuidv4()}@filigran.io`;
      const user = await UserProvisioningApp.autoProvisionNewUser({
        email: testMail,
      });
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
      const user = await UserProvisioningApp.autoProvisionNewUser({
        email: testMail,
      });
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
});
