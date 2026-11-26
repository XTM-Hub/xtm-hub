import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../../tests/helper/test.helper';
import {
  requestContextAdminSecondOrga,
  TEST_ORGANIZATIONS,
} from '../../../../../tests/tests.const';
import { OrganizationCapability } from '../../../../__generated__/resolvers-types';
import { requestContext } from '../../../../context/request.context';
import { UserId } from '../../../../model/kanel/public/User';
import * as pub from '../../../../pub';
import * as MailService from '../../../../server/mail-service';
import { ErrorCode } from '../../../../utils/error/error.code';
import { TelemetryApp } from '../../../telemetry/telemetry.app';
import { TelemetrySource } from '../../../telemetry/telemetry.const';
import { TelemetryEventType } from '../../../telemetry/telemetry.types';
import { OrganizationDomain } from '../../organization/organization.domain';
import { UserDomain } from '../user-domain/user.domain';
import { UserOrganizationPendingDomain } from '../user-pending/user-organization-pending.domain';
import { UserHelper } from '../user.helper';
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

    it('should create a new user via autoProvisionNewUser when none exists, forwarding the given options', async () => {
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

  describe('autoProvisionNewUser', () => {
    let createdEmails: string[] = [];
    let createdOrganizationNames: string[] = [];

    beforeEach(() => {
      createdEmails = [];
      createdOrganizationNames = [];
    });

    afterEach(async () => {
      vi.useRealTimers();
      await Promise.all(
        createdEmails.map((email) => UserHelper.removeUser({ email }))
      );
      await Promise.all(
        createdOrganizationNames.map((name) =>
          OrganizationDomain.deleteOrganizationBy({ name })
        )
      );
    });

    it('should create a new user with Role USER and not add in an existing Organization, but in pending organization', async () => {
      const testMail = `testCreateNewUserFromInvitation${uuidv4()}@filigran.io`;
      createdEmails.push(testMail);
      await UserProvisioningApp.autoProvisionNewUser({
        email: testMail,
      });
      const newUser = (await UserDomain.loadUserBy({ email: testMail }))!;
      const newUserPendingOrg =
        await UserOrganizationPendingDomain.loadUserOrganizationPending({
          user_id: newUser.id,
        });
      expect(newUser).toBeTruthy();
      expect(newUser.selected_org_capabilities).toHaveLength(1);
      expect(newUser.organizations[0]?.personal_space).toBe(true);
      expect(newUserPendingOrg).toHaveLength(1);
      expect(newUserPendingOrg[0]?.organization_id).toBe(
        TEST_ORGANIZATIONS.FILIGRAN.ID
      );
    });

    it('should add new user with Role admin organization with an new Organization, keeping the given first_name/last_name/picture', async () => {
      const organizationName = 'test-new-organization.fr';
      const testMail = `testCreateNewUserFromInvitation${uuidv4()}@${organizationName}`;
      createdEmails.push(testMail);
      createdOrganizationNames.push(organizationName);

      vi.useFakeTimers();
      const date = new Date(Date.UTC(2025, 1, 3, 13, 12, 15));
      vi.setSystemTime(date);
      const telemetrySpy = vi
        .spyOn(TelemetryApp, 'sendTelemetryEvent')
        .mockResolvedValue();

      await UserProvisioningApp.autoProvisionNewUser({
        email: testMail,
        first_name: 'Jane',
        last_name: 'Doe',
        picture: 'jane-doe.png',
      });
      const newUser = (await UserDomain.loadUserBy({ email: testMail }))!;
      const newUserPendingOrg =
        await UserOrganizationPendingDomain.loadUserOrganizationPending({
          user_id: newUser.id,
        });

      expect(newUser).toBeTruthy();
      expect(newUser).toMatchObject({
        first_name: 'Jane',
        last_name: 'Doe',
        picture: 'jane-doe.png',
      });
      expect(newUserPendingOrg).toHaveLength(0);

      const newOrganization = await OrganizationDomain.loadOrganizationBy({
        name: organizationName,
      });
      if (!newOrganization) {
        throw new Error(ErrorCode.OrganizationNotFound);
      }
      const userOrgCapa = await UserDomain.loadUserCapabilitiesByOrganization(
        newUser.id as UserId,
        newOrganization.id
      );
      expect(userOrgCapa.capabilities?.length).toBe(1);
      expect(
        userOrgCapa.capabilities?.includes(
          OrganizationCapability.AdministrateOrganization
        )
      ).toBeTruthy();

      expect(newOrganization).toBeTruthy();

      expect(telemetrySpy).toHaveBeenCalledExactlyOnceWith({
        '@timestamp': '2025-02-03T13:12:15.000Z',
        event_type: TelemetryEventType.CREATE_ORGANIZATION,
        organization_id: expect.any(String),
        organization_name: newOrganization.name,
        organization_type: 'Professional',
        source: TelemetrySource.XTMHUB,
        user_id: newUser!.id,
        domains: ['test-new-organization.fr'],
      });
    });

    it('should create a new user with Role USER and should not add it to pending organization if orga does not exist', async () => {
      const testMail = `testCreateNewUserFromInvitation${uuidv4()}@whatever.io`;
      createdEmails.push(testMail);
      await UserProvisioningApp.autoProvisionNewUser({
        email: testMail,
      });
      const newUser = (await UserDomain.loadUserBy({ email: testMail }))!;
      const newUserPendingOrg =
        await UserOrganizationPendingDomain.loadUserOrganizationPending({
          user_id: newUser.id,
        });
      expect(newUser).toBeTruthy();
      expect(newUser.selected_org_capabilities).toHaveLength(1);

      expect(newUserPendingOrg).toHaveLength(0);
    });

    it('should send a welcome email by default when creating a new user', async () => {
      const sendMailSpy = vi.spyOn(MailService, 'sendMail').mockResolvedValue();
      const testMail = `testWelcomeEmail${uuidv4()}@whatever.io`;
      createdEmails.push(testMail);

      await UserProvisioningApp.autoProvisionNewUser({ email: testMail });

      expect(sendMailSpy).toHaveBeenCalledWith(
        expect.objectContaining({ to: testMail, template: 'welcome' })
      );

      sendMailSpy.mockRestore();
    });

    it('should not send a welcome email when sendWelcomeEmail is false', async () => {
      const sendMailSpy = vi.spyOn(MailService, 'sendMail').mockResolvedValue();
      const testMail = `testWelcomeEmail${uuidv4()}@whatever.io`;
      createdEmails.push(testMail);

      await UserProvisioningApp.autoProvisionNewUser(
        { email: testMail },
        { sendWelcomeEmail: false }
      );

      expect(sendMailSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({ template: 'welcome' })
      );

      sendMailSpy.mockRestore();
    });

    it('should reject a malformed email without creating a user or sending a welcome email', async () => {
      const sendMailSpy = vi.spyOn(MailService, 'sendMail').mockResolvedValue();
      const malformedEmail = 'not-an-email';

      const call = UserProvisioningApp.autoProvisionNewUser({
        email: malformedEmail,
      });

      await expect(call).rejects.toThrow('INVALID_EMAIL');
      expect(
        await UserDomain.loadUserBy({ email: malformedEmail })
      ).toBeUndefined();
      expect(sendMailSpy).not.toHaveBeenCalled();

      sendMailSpy.mockRestore();
    });
  });

  describe('provisionUserForOrganizations', () => {
    let createdEmails: string[] = [];

    beforeEach(() => {
      createdEmails = [];
      requestContext.set(requestContextAdminSecondOrga);
    });

    afterEach(async () => {
      vi.restoreAllMocks();
      await Promise.all(
        createdEmails.map((email) => UserHelper.removeUser({ email }))
      );
    });

    it('should create a new user and grant the given organization capabilities when the email does not exist yet', async () => {
      const email = `provision-${uuidv4()}@filigran.io`;
      createdEmails.push(email);

      const user = await UserProvisioningApp.provisionUserForOrganizations({
        userData: { email },
        orgCapabilities: [
          {
            organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
            capabilities: [OrganizationCapability.ManageAccess],
          },
        ],
        mode: 'add',
      });

      expect(user.email).toBe(email);
      const orgCapabilities =
        await UserDomain.loadUserCapabilitiesByOrganization(
          user.id as UserId,
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
        );
      expect(orgCapabilities.capabilities).toEqual([
        OrganizationCapability.ManageAccess,
      ]);
    });

    it('should reuse an existing user unchanged and send a welcome email when organizationForWelcomeEmail is given', async () => {
      const existingUser = await TestHelper.user.insert({
        email: `provision-${uuidv4()}@filigran.io`,
        first_name: 'Existing',
      });
      createdEmails.push(existingUser.email);
      const secondOrganization = (await OrganizationDomain.loadOrganizationBy({
        id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      }))!;
      const sendMailSpy = vi.spyOn(MailService, 'sendMail').mockResolvedValue();

      const user = await UserProvisioningApp.provisionUserForOrganizations({
        userData: { email: existingUser.email, first_name: 'Overwritten' },
        orgCapabilities: [
          {
            organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
            capabilities: [OrganizationCapability.ManageAccess],
          },
        ],
        mode: 'add',
        organizationForWelcomeEmail: secondOrganization,
      });

      expect(user.first_name).toBe('Existing');
      expect(sendMailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: existingUser.email,
          template: 'new_user_organization',
        })
      );
    });

    it('should not send a welcome email for a newly created user even when organizationForWelcomeEmail is given', async () => {
      const email = `provision-${uuidv4()}@filigran.io`;
      createdEmails.push(email);
      const secondOrganization = (await OrganizationDomain.loadOrganizationBy({
        id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      }))!;
      const sendMailSpy = vi.spyOn(MailService, 'sendMail').mockResolvedValue();

      await UserProvisioningApp.provisionUserForOrganizations({
        userData: { email },
        orgCapabilities: [
          {
            organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
            capabilities: [OrganizationCapability.ManageAccess],
          },
        ],
        mode: 'add',
        organizationForWelcomeEmail: secondOrganization,
      });

      expect(sendMailSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({ template: 'new_user_organization' })
      );
    });

    it('should not send any email when reusing an existing user without organizationForWelcomeEmail', async () => {
      const existingUser = await TestHelper.user.insert({
        email: `provision-${uuidv4()}@filigran.io`,
      });
      createdEmails.push(existingUser.email);
      const sendMailSpy = vi.spyOn(MailService, 'sendMail').mockResolvedValue();

      await UserProvisioningApp.provisionUserForOrganizations({
        userData: { email: existingUser.email },
        orgCapabilities: [
          {
            organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
            capabilities: [OrganizationCapability.ManageAccess],
          },
        ],
        mode: 'add',
      });

      expect(sendMailSpy).not.toHaveBeenCalled();
    });

    it('should remove the pending request and dispatch a UserPending delete event for an organization the user was pending in', async () => {
      const pendingUser = await TestHelper.user.insertWithPendingOrganization(
        { email: `provision-${uuidv4()}@filigran.io` },
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
      );
      createdEmails.push(pendingUser.email);
      const dispatchSpy = vi.spyOn(pub, 'dispatch');

      await UserProvisioningApp.provisionUserForOrganizations({
        userData: { email: pendingUser.email },
        orgCapabilities: [
          {
            organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
            capabilities: [OrganizationCapability.ManageAccess],
          },
        ],
        mode: 'add',
      });

      const pendingAfter =
        await UserOrganizationPendingDomain.loadUserOrganizationPending({
          user_id: pendingUser.id,
          organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        });
      expect(pendingAfter).toHaveLength(0);
      expect(dispatchSpy).toHaveBeenCalledWith(
        'UserPending',
        'delete',
        expect.objectContaining({
          id: pendingUser.id,
          pending_organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        }),
        'User'
      );
    });

    it('should not dispatch a UserPending delete event when the user had no pending request for the organization', async () => {
      const email = `provision-${uuidv4()}@filigran.io`;
      createdEmails.push(email);
      const dispatchSpy = vi.spyOn(pub, 'dispatch');

      await UserProvisioningApp.provisionUserForOrganizations({
        userData: { email },
        orgCapabilities: [
          {
            organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
            capabilities: [OrganizationCapability.ManageAccess],
          },
        ],
        mode: 'add',
      });

      expect(dispatchSpy).not.toHaveBeenCalledWith(
        'UserPending',
        'delete',
        expect.anything(),
        'User'
      );
    });

    it('should dispatch a User add event for the provisioned user', async () => {
      const email = `provision-${uuidv4()}@filigran.io`;
      createdEmails.push(email);
      const dispatchSpy = vi.spyOn(pub, 'dispatch');

      const user = await UserProvisioningApp.provisionUserForOrganizations({
        userData: { email },
        orgCapabilities: [
          {
            organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
            capabilities: [OrganizationCapability.ManageAccess],
          },
        ],
        mode: 'add',
      });

      expect(dispatchSpy).toHaveBeenCalledWith('User', 'add', user);
    });

    it('should reject and not create the user when the caller lacks capabilities on one of the target organizations', async () => {
      const email = `provision-${uuidv4()}@filigran.io`;

      const call = UserProvisioningApp.provisionUserForOrganizations({
        userData: { email },
        orgCapabilities: [
          {
            organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
            capabilities: [OrganizationCapability.ManageAccess],
          },
        ],
        mode: 'add',
      });

      await expect(call).rejects.toThrow(
        ErrorCode.MissingCapabilityOnOrganization
      );
      expect(await UserDomain.loadUserBy({ email })).toBeUndefined();
    });
  });
});
