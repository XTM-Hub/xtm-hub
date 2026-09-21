import { v4 as uuidv4 } from 'uuid';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import { TEST_ORGANIZATIONS } from '../../../../tests/tests.const';
import { OrganizationId } from '../../../model/kanel/public/Organization';
import { ErrorCode } from '../../../utils/error/error.code';
import { TelemetryApp } from '../../telemetry/telemetry.app';
import { TelemetrySource } from '../../telemetry/telemetry.const';
import { TelemetryEventType } from '../../telemetry/telemetry.types';
import { UserDomain } from '../user/user-domain/user.domain';
import { UserOrganizationDomain } from '../user/user-organization/user-organization.domain';
import { UserOrganizationPendingDomain } from '../user/user-pending/user-organization-pending.domain';
import { UserProvisioningDomain } from '../user/user-provisioning/user-provisioning.domain';
import { UserHelper } from '../user/user.helper';
import { OrganizationApp } from './organization.app';
import { OrganizationHelper } from './organization.helper';

describe('organizationApp', () => {
  afterEach(async () => {
    vi.useRealTimers();
  });
  describe('updateOrganization', () => {
    it('should send a telemetry event', async () => {
      vi.useFakeTimers();
      const date = new Date(Date.UTC(2025, 1, 3, 13, 12, 15));
      vi.setSystemTime(date);
      const telemetrySpy = vi
        .spyOn(TelemetryApp, 'sendTelemetryEvent')
        .mockResolvedValue();

      await OrganizationApp.updateOrganization(
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        {
          domains: [
            TEST_ORGANIZATIONS.SECOND_ORGANIZATION.DOMAINS.FIRST.NAME,
            TEST_ORGANIZATIONS.SECOND_ORGANIZATION.DOMAINS.SECOND.NAME,
          ],
          name: 'new OrgaName',
        }
      );

      expect(telemetrySpy).toHaveBeenCalledExactlyOnceWith({
        '@timestamp': '2025-02-03T13:12:15.000Z',
        event_type: TelemetryEventType.UPDATE_ORGANIZATION,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        organization_name: 'new OrgaName',
        organization_type: 'Professional',
        source: TelemetrySource.XTMHUB,
        user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
        domains: [
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.DOMAINS.FIRST.NAME,
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.DOMAINS.SECOND.NAME,
        ],
      });
    });
  });

  describe('createOrganization', () => {
    it('should send a telemetry event', async () => {
      vi.useFakeTimers();
      const date = new Date(Date.UTC(2025, 1, 3, 13, 12, 15));
      vi.setSystemTime(date);
      const telemetrySpy = vi
        .spyOn(TelemetryApp, 'sendTelemetryEvent')
        .mockResolvedValue();

      await OrganizationApp.createOrganization({
        domains: ['test.com', 'test.fr'],
        name: 'test.com',
      });

      expect(telemetrySpy).toHaveBeenCalledExactlyOnceWith({
        '@timestamp': '2025-02-03T13:12:15.000Z',
        event_type: TelemetryEventType.CREATE_ORGANIZATION,
        organization_id: expect.any(String),
        organization_name: 'test.com',
        organization_type: 'Professional',
        source: TelemetrySource.XTMHUB,
        user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
        domains: ['test.com', 'test.fr'],
      });
    });

    it('should throw if an organization with the same domain exists', async () => {
      await TestHelper.organization.create({
        name: 'domain1.io',
        domains: ['domain1.io', 'domain2.io'],
      });

      const call = OrganizationApp.createOrganization({
        domains: ['domain1.io'],
        name: 'otherDomain.io',
      });

      await expect(call).rejects.toThrow(
        ErrorCode.OrganizationSameDomainExists
      );
    });

    it('should throw if an organization with the same name exists', async () => {
      await TestHelper.organization.create({
        name: 'alreadyExistingOrga',
        domains: ['alreadyExistingOrga.io'],
      });

      const call = OrganizationApp.createOrganization({
        domains: ['whatever.io'],
        name: 'alreadyExistingOrga',
      });

      await expect(call).rejects.toThrow(ErrorCode.OrganizationSameNameExists);
    });
  });

  describe('deleteOrganization', () => {
    it('should delete the organization', async () => {
      const { id: organizationId } = await TestHelper.organization.create({
        name: 'newOrganization',
        domains: ['orga.com'],
      });

      const newOrganization = await TestHelper.organization.load({
        id: organizationId,
      });
      expect(newOrganization).toBeDefined();

      await OrganizationApp.deleteOrganization(organizationId);

      const deletedOrganization = await TestHelper.organization.load({
        id: organizationId,
      });
      expect(deletedOrganization).toBeUndefined();
    });

    it('should delete an organization that has a single linked user', async () => {
      const organization = await TestHelper.organization.create({
        name: 'singleUserOrganization',
      });
      const user = await UserProvisioningDomain.createUser(
        { email: `delete-orga-${uuidv4()}@delete-orga-test.io` },
        { sendWelcomeEmail: false }
      );
      await UserOrganizationDomain.createUserOrganizationRelation({
        user_id: user.id,
        organizations_id: [organization.id],
      });

      await OrganizationApp.deleteOrganization(organization.id);

      expect(
        await TestHelper.organization.load({ id: organization.id })
      ).toBeUndefined();
    });

    it('should throw when the organization does not exist', async () => {
      const call = OrganizationApp.deleteOrganization(
        uuidv4() as OrganizationId
      );

      await expect(call).rejects.toThrow(ErrorCode.OrganizationNotFound);
    });

    it('should throw when the organization has more than one linked user', async () => {
      const organization = await TestHelper.organization.create({
        name: 'multiUserOrganization',
      });
      const firstUser = await UserProvisioningDomain.createUser(
        { email: `delete-orga-${uuidv4()}@delete-orga-test.io` },
        { sendWelcomeEmail: false }
      );
      const secondUser = await UserProvisioningDomain.createUser(
        { email: `delete-orga-${uuidv4()}@delete-orga-test.io` },
        { sendWelcomeEmail: false }
      );
      await UserOrganizationDomain.createUserOrganizationRelation({
        user_id: firstUser.id,
        organizations_id: [organization.id],
      });
      await UserOrganizationDomain.createUserOrganizationRelation({
        user_id: secondUser.id,
        organizations_id: [organization.id],
      });

      const call = OrganizationApp.deleteOrganization(organization.id);

      await expect(call).rejects.toThrow(
        ErrorCode.DeleteOrganizationRequiresSingleUser
      );
      expect(
        await TestHelper.organization.load({ id: organization.id })
      ).toBeDefined();
    });

    it('should throw when the organization has pending users even with a single linked user', async () => {
      const organization = await TestHelper.organization.create({
        name: 'pendingUserOrganization',
      });
      const linkedUser = await UserProvisioningDomain.createUser(
        { email: `delete-orga-${uuidv4()}@delete-orga-test.io` },
        { sendWelcomeEmail: false }
      );
      const pendingUser = await UserProvisioningDomain.createUser(
        { email: `delete-orga-${uuidv4()}@delete-orga-test.io` },
        { sendWelcomeEmail: false }
      );
      await UserOrganizationDomain.createUserOrganizationRelation({
        user_id: linkedUser.id,
        organizations_id: [organization.id],
      });
      await UserOrganizationPendingDomain.insertNewUserOrganizationPending({
        user_id: pendingUser.id,
        organization_id: organization.id,
      });

      const call = OrganizationApp.deleteOrganization(organization.id);

      await expect(call).rejects.toThrow(
        ErrorCode.DeleteOrganizationPendingUsers
      );
      expect(
        await TestHelper.organization.load({ id: organization.id })
      ).toBeDefined();
    });

    it('should throw when the organization has connected products', async () => {
      const organization = await TestHelper.organization.create({
        name: 'connectedProductOrganization',
      });
      const linkedUser = await UserProvisioningDomain.createUser(
        { email: `delete-orga-${uuidv4()}@delete-orga-test.io` },
        { sendWelcomeEmail: false }
      );
      await UserOrganizationDomain.createUserOrganizationRelation({
        user_id: linkedUser.id,
        organizations_id: [organization.id],
      });
      const serviceInstance = await TestHelper.serviceInstance.create();
      await TestHelper.platformConfiguration.create({
        service_instance_id: serviceInstance.id,
      });
      await TestHelper.subscription.create({
        service_instance_id: serviceInstance.id,
        organization_id: organization.id,
      });

      const call = OrganizationApp.deleteOrganization(organization.id);

      await expect(call).rejects.toThrow(
        ErrorCode.DeleteOrganizationBlockedByConnectedProduct
      );
      expect(
        await TestHelper.organization.load({ id: organization.id })
      ).toBeDefined();

      await TestHelper.subscription.delete({
        service_instance_id: serviceInstance.id,
      });
      await TestHelper.platformConfiguration.delete({
        service_instance_id: serviceInstance.id,
      });
      await TestHelper.serviceInstance.delete({ id: serviceInstance.id });
      await TestHelper.organization.delete({ id: organization.id });
      await UserHelper.removeUser({ id: linkedUser.id });
    });

    it('should not apply the guards on a personal space organization', async () => {
      const user = await UserProvisioningDomain.createUser(
        { email: `delete-orga-${uuidv4()}@delete-orga-test.io` },
        { sendWelcomeEmail: false }
      );
      const personalSpaceId = OrganizationHelper.personalSpaceIdOf(user);
      const pendingUser = await UserProvisioningDomain.createUser(
        { email: `delete-orga-${uuidv4()}@delete-orga-test.io` },
        { sendWelcomeEmail: false }
      );
      await UserOrganizationPendingDomain.insertNewUserOrganizationPending({
        user_id: pendingUser.id,
        organization_id: personalSpaceId,
      });
      await UserDomain.deleteUserBy({ id: user.id });

      await OrganizationApp.deleteOrganization(personalSpaceId);

      expect(
        await TestHelper.organization.load({ id: personalSpaceId })
      ).toBeUndefined();
    });
  });
});
