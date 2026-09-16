import { v4 as uuidv4 } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../../tests/helper/test.helper';
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
});
