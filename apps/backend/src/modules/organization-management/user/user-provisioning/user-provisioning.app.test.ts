import { v4 as uuidv4 } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../../tests/helper/test.helper';
import * as MailService from '../../../../server/mail-service';
import { UserProvisioningApp } from './user-provisioning.app';

describe('userProvisioningApp', () => {
  describe('getOrProvisionUser', () => {
    it('should return the existing user unchanged when upsert is not requested', async () => {
      const existingUser = await TestHelper.user.insert({
        email: `get-or-provision-${uuidv4()}@filigran.io`,
        first_name: 'Existing',
        last_login: null,
      });

      const user = await UserProvisioningApp.getOrProvisionUser(existingUser);

      expect(user).toMatchObject({
        id: existingUser.id,
        first_name: 'Existing',
      });
      expect(user.last_login).toBeNull();
    });

    it('should return the freshly updated user when upsert is requested', async () => {
      const existingUser = await TestHelper.user.insert({
        email: `get-or-provision-${uuidv4()}@filigran.io`,
        first_name: null,
        last_login: null,
      });

      const user = await UserProvisioningApp.getOrProvisionUser(
        { ...existingUser, first_name: 'Filled' },
        { upsert: true }
      );

      expect(user.first_name).toBe('Filled');
      expect(user.last_login).not.toBeNull();

      const persistedUser = await TestHelper.user.load({ id: existingUser.id });
      expect(persistedUser).toMatchObject({ first_name: 'Filled' });
      expect(persistedUser.last_login).not.toBeNull();
    });

    it('should create a new user via createNewUserFromInvitation when none exists, forwarding the given options', async () => {
      const sendMailSpy = vi.spyOn(MailService, 'sendMail').mockResolvedValue();
      const email = `get-or-provision-${uuidv4()}@filigran.io`;

      const user = await UserProvisioningApp.getOrProvisionUser(
        { email, first_name: 'New', last_name: 'User', picture: null },
        { sendWelcomeEmail: false }
      );

      expect(user).toMatchObject({
        email,
        first_name: 'New',
        last_name: 'User',
      });
      expect(sendMailSpy).not.toHaveBeenCalled();
    });
  });
});
