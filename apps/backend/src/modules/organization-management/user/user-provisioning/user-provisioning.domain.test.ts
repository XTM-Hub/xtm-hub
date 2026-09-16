import { v4 as uuidv4 } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../../tests/helper/test.helper';
import { TEST_ORGANIZATIONS } from '../../../../../tests/tests.const';
import * as MailService from '../../../../server/mail-service';
import { UserProvisioningDomain } from './user-provisioning.domain';

describe('userProvisioningDomain', () => {
  describe('createUser', () => {
    it('should create the user with a personal space organization and link them together', async () => {
      const email = `create-user-${uuidv4()}@filigran.io`;

      const user = await UserProvisioningDomain.createUser(
        { email },
        { sendWelcomeEmail: false }
      );

      const personalSpaceOrganization = await TestHelper.organization.load({
        id: user.id,
      });
      expect(personalSpaceOrganization).toMatchObject({
        name: email,
        personal_space: true,
      });
      expect(user.selected_organization_id).toBe(personalSpaceOrganization!.id);

      const userOrganization = await TestHelper.user_Organization.load({
        user_id: user.id,
        organization_id: personalSpaceOrganization!.id,
      });
      expect(userOrganization).toBeTruthy();

      const capabilities = await TestHelper.user_OrganizationCapability.loadAll(
        { user_organization_id: userOrganization.id }
      );
      expect(capabilities.map((capability) => capability.name)).toEqual([
        'ADMINISTRATE_ORGANIZATION',
      ]);
    });

    it('should use the given selected_organization_id instead of the personal space when provided', async () => {
      const email = `create-user-${uuidv4()}@filigran.io`;
      const organization = await TestHelper.organization.create();

      const user = await UserProvisioningDomain.createUser(
        { email, selected_organization_id: organization.id },
        { sendWelcomeEmail: false }
      );

      expect(user.selected_organization_id).toBe(organization.id);
    });

    it('should send a welcome email by default', async () => {
      const sendMailSpy = vi.spyOn(MailService, 'sendMail').mockResolvedValue();
      const email = `create-user-${uuidv4()}@filigran.io`;

      await UserProvisioningDomain.createUser({ email });

      expect(sendMailSpy).toHaveBeenCalledWith(
        expect.objectContaining({ to: email, template: 'welcome' })
      );
    });

    it('should not send a welcome email when sendWelcomeEmail is false', async () => {
      const sendMailSpy = vi.spyOn(MailService, 'sendMail').mockResolvedValue();
      const email = `create-user-${uuidv4()}@filigran.io`;

      await UserProvisioningDomain.createUser(
        { email },
        { sendWelcomeEmail: false }
      );

      expect(sendMailSpy).not.toHaveBeenCalled();
    });
  });

  describe('upsertUser', () => {
    it('should create a new user with the given profile when the email does not exist yet', async () => {
      const email = `ensure-user-${uuidv4()}@filigran.io`;

      const { user, created } = await UserProvisioningDomain.upsertUser({
        email,
        first_name: 'Jane',
        last_name: 'Doe',
        picture: null,
        selected_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
      });

      expect(created).toBe(true);
      expect(user).toMatchObject({
        email,
        first_name: 'Jane',
        last_name: 'Doe',
        selected_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
      });
    });

    it('should fill blank first_name/last_name/picture on an existing user but keep already-set values', async () => {
      const existingUser = await TestHelper.user.insert({
        email: `ensure-user-${uuidv4()}@filigran.io`,
        first_name: null,
        last_name: 'Existing',
        picture: null,
      });

      const { user, created } = await UserProvisioningDomain.upsertUser({
        email: existingUser.email,
        first_name: 'FilledFirstName',
        last_name: 'IgnoredLastName',
        picture: 'filled-picture.png',
        selected_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
      });

      expect(created).toBe(false);
      expect(user).toMatchObject({
        id: existingUser.id,
        first_name: 'FilledFirstName',
        last_name: 'Existing',
        picture: 'filled-picture.png',
      });
    });

    it('should update salt/password when a password is given for an existing user', async () => {
      const existingUser = await TestHelper.user.insert({
        email: `ensure-user-${uuidv4()}@filigran.io`,
      });

      const { user } = await UserProvisioningDomain.upsertUser(
        {
          email: existingUser.email,
          first_name: existingUser.first_name,
          last_name: existingUser.last_name,
          picture: existingUser.picture,
          selected_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        },
        { password: 'new-password' }
      );

      expect(user.salt).not.toBe(existingUser.salt);
      expect(user.password).not.toBe(existingUser.password);
    });

    it('should not modify salt/password on an existing user when no password is given', async () => {
      const existingUser = await TestHelper.user.insert({
        email: `ensure-user-${uuidv4()}@filigran.io`,
      });

      const { user } = await UserProvisioningDomain.upsertUser({
        email: existingUser.email,
        first_name: existingUser.first_name,
        last_name: existingUser.last_name,
        picture: existingUser.picture,
        selected_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
      });

      expect(user.salt).toBe(existingUser.salt);
      expect(user.password).toBe(existingUser.password);
    });
  });

  describe('linkUserAsNewOrganizationAdmin', () => {
    it('should create a new organization for the email domain and grant the user administrate capability', async () => {
      const domain = `link-admin-${uuidv4()}.io`;
      const email = `user@${domain}`;
      const user = await UserProvisioningDomain.createUser(
        { email },
        { sendWelcomeEmail: false }
      );

      await UserProvisioningDomain.linkUserAsNewOrganizationAdmin(user, email);

      const newOrganization = await TestHelper.organization.load({
        name: domain,
      });
      expect(newOrganization).toMatchObject({ domains: [domain] });

      const userOrganization = await TestHelper.user_Organization.load({
        user_id: user.id,
        organization_id: newOrganization!.id,
      });
      expect(userOrganization).toBeTruthy();

      const capabilities = await TestHelper.user_OrganizationCapability.loadAll(
        { user_organization_id: userOrganization.id }
      );
      expect(capabilities.map((capability) => capability.name)).toEqual([
        'ADMINISTRATE_ORGANIZATION',
      ]);
    });

    it('should throw a BadRequestError when the email has no domain', async () => {
      const user = await UserProvisioningDomain.createUser(
        { email: `link-admin-${uuidv4()}@filigran.io` },
        { sendWelcomeEmail: false }
      );

      const call = UserProvisioningDomain.linkUserAsNewOrganizationAdmin(
        user,
        'not-an-email'
      );

      await expect(call).rejects.toThrow('INVALID_EMAIL');
    });
  });

  describe('linkUserToPendingOrganization', () => {
    it("should insert the user into the organization's pending list", async () => {
      const user = await UserProvisioningDomain.createUser(
        { email: `link-pending-${uuidv4()}@filigran.io` },
        { sendWelcomeEmail: false }
      );
      const organization = await TestHelper.organization.create();

      await UserProvisioningDomain.linkUserToPendingOrganization(
        user,
        organization
      );

      const pending = await TestHelper.user_OrganizationPending.loadAll({
        user_id: user.id,
      });
      expect(pending).toHaveLength(1);
      expect(pending[0]?.organization_id).toBe(organization.id);
    });
  });
});
