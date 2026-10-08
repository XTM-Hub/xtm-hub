import { v4 as uuidv4 } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import { TEST_ORGANIZATIONS } from '../../../../tests/tests.const';
import { OrganizationCapability } from '../../../__generated__/resolvers-types';
import { OrganizationId } from '../../../model/kanel/public/Organization';
import { UserDomain } from '../user/user-domain/user.domain';
import { OrganizationDataLoader } from './organization.dataloader';

describe('batchLoadAdministratorEmails', () => {
  const loadAdministratorEmails = async (organizationId: OrganizationId) => {
    const administrators =
      await UserDomain.loadUsersByCapabilitiesInOrganization(organizationId, [
        OrganizationCapability.AdministrateOrganization,
      ]);
    return administrators.map(({ email }) => email).sort();
  };

  it('should return the administrator emails of each requested organization, in order, with a single query', async () => {
    // Given
    const unknownOrganizationId = uuidv4() as OrganizationId;
    const batchSpy = vi.spyOn(
      UserDomain,
      'loadUserEmailsByCapabilityInOrganizations'
    );

    // When
    const [secondOrganizationEmails, unknownEmails, filigranEmails] =
      await OrganizationDataLoader.batchLoadAdministratorEmails([
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        unknownOrganizationId,
        TEST_ORGANIZATIONS.FILIGRAN.ID,
      ]);

    // Then
    expect(batchSpy).toHaveBeenCalledTimes(1);
    expect(secondOrganizationEmails).toContain(
      TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.EMAIL
    );
    expect([...secondOrganizationEmails].sort()).toEqual(
      await loadAdministratorEmails(TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID)
    );
    expect([...filigranEmails].sort()).toEqual(
      await loadAdministratorEmails(TEST_ORGANIZATIONS.FILIGRAN.ID)
    );
    expect(unknownEmails).toEqual([]);
  });

  it('should batch the administrator emails of several organizations loaded in the same tick', async () => {
    // Given
    const batchSpy = vi.spyOn(
      UserDomain,
      'loadUserEmailsByCapabilityInOrganizations'
    );
    const { administratorEmailsByOrganizationIdLoader } =
      OrganizationDataLoader.create();

    // When
    await Promise.all([
      administratorEmailsByOrganizationIdLoader.load(
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
      ),
      administratorEmailsByOrganizationIdLoader.load(
        TEST_ORGANIZATIONS.FILIGRAN.ID
      ),
      administratorEmailsByOrganizationIdLoader.load(
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
      ),
    ]);

    // Then
    expect(batchSpy).toHaveBeenCalledTimes(1);
    expect(batchSpy).toHaveBeenCalledWith(
      [
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        TEST_ORGANIZATIONS.FILIGRAN.ID,
      ],
      OrganizationCapability.AdministrateOrganization
    );
  });
});
