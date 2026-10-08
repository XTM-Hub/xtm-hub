import { v4 as uuidv4 } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import {
  contextSimpleUserFiligran2,
  GRAPHQL_RESOLVE_INFO,
  TEST_ORGANIZATIONS,
} from '../../../../tests/tests.const';
import {
  OrderingMode,
  Organization,
  OrganizationCapability,
  OrganizationConnection,
  OrganizationEdge,
  OrganizationInput,
  OrganizationOrdering,
  OrganizationResolvers,
  PageInfo,
} from '../../../__generated__/resolvers-types';
import { OrganizationId } from '../../../model/kanel/public/Organization';
import User from '../../../model/kanel/public/User';
import {
  AlreadyExistsErrorCode,
  BadRequestErrorCode,
  ForbiddenErrorCode,
} from '../../../utils/error/error.code';
import { ErrorType } from '../../../utils/error/error.type';
import { UserDomain } from '../user/user-domain/user.domain';
import { OrganizationApp } from './organization.app';
import { OrganizationDomain } from './organization.domain';
import organizationsResolver from './organization.resolver';

describe('organization GraphQL query', () => {
  it('should load organization by id and return result', async () => {
    // Given
    const id = TEST_ORGANIZATIONS.FILIGRAN.ID;
    const expected = { id, name: 'Filigran' } as unknown as Awaited<
      ReturnType<typeof OrganizationDomain.loadOrganizationBy>
    >;
    vi.spyOn(OrganizationDomain, 'loadOrganizationBy').mockResolvedValue(
      expected
    );

    // When
    const result = await organizationsResolver.Query!.organization!(
      {},
      { id },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(OrganizationDomain.loadOrganizationBy).toHaveBeenCalledWith({ id });
    expect(result).toMatchObject({ id, name: 'Filigran' });
  });
});

describe('organizations GraphQL query', () => {
  it('should load all organizations with opts and return result', async () => {
    // Given
    const opts = {
      first: 10,
      orderBy: OrganizationOrdering.Name,
      orderMode: OrderingMode.Asc,
    };
    const orgId = uuidv4() as OrganizationId;
    const organization: Organization = {
      id: orgId,
      name: 'Filigran',
      personal_space: false,
    };
    const edge: OrganizationEdge = {
      cursor: orgId,
      node: organization,
    };
    const pageInfo: PageInfo = {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: orgId,
      endCursor: orgId,
    };
    const expected: OrganizationConnection = {
      edges: [edge],
      pageInfo,
      totalCount: 1,
    };
    vi.spyOn(OrganizationDomain, 'loadOrganizations').mockResolvedValue(
      expected
    );

    // When
    const result = await organizationsResolver.Query!.organizations!(
      {},
      opts,
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(OrganizationDomain.loadOrganizations).toHaveBeenCalledWith(opts);
    expect(result).toEqual(expected);
  });
});

describe('user organizations GraphQL query', () => {
  it('should load organizations by context user id and return result', async () => {
    // Given
    const expected = [
      { id: TEST_ORGANIZATIONS.FILIGRAN.ID, name: 'Filigran' },
    ] as unknown as Awaited<
      ReturnType<typeof OrganizationDomain.loadOrganizationsByUser>
    >;
    vi.spyOn(OrganizationDomain, 'loadOrganizationsByUser').mockResolvedValue(
      expected
    );

    // When
    const result = await organizationsResolver.Query!.userOrganizations!(
      {},
      {},
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(OrganizationDomain.loadOrganizationsByUser).toHaveBeenCalledWith(
      contextSimpleUserFiligran2.user.id
    );
    expect(result).toEqual(expected);
  });
});

describe('add organization GraphQL mutation', () => {
  it('should delegate to organizationApp.createOrganization and return created organization', async () => {
    // Given
    const input: OrganizationInput = {
      name: 'New Org',
      domains: ['new-org.com'],
    };
    const expected = {
      id: uuidv4() as OrganizationId,
      name: 'New Org',
    } as unknown as Awaited<
      ReturnType<typeof OrganizationApp.createOrganization>
    >;
    vi.spyOn(OrganizationApp, 'createOrganization').mockResolvedValue(expected);

    // When
    const result = await organizationsResolver.Mutation!.addOrganization!(
      {},
      { input },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(OrganizationApp.createOrganization).toHaveBeenCalledWith(input);
    expect(result).toMatchObject({ name: 'New Org' });
  });

  it('should map to AlreadyExists for OrganizationSameNameExists error', async () => {
    // Given
    const input: OrganizationInput = { name: 'New Org' };
    vi.spyOn(OrganizationApp, 'createOrganization').mockRejectedValue(
      new Error(AlreadyExistsErrorCode.OrganizationSameNameExists)
    );

    // When
    const call = organizationsResolver.Mutation!.addOrganization!(
      {},
      { input },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    await expect(call).rejects.toMatchObject({ name: ErrorType.AlreadyExists });
  });
});

describe('edit organization GraphQL mutation', () => {
  it('should delegate to organizationApp.updateOrganization with typed id and return result', async () => {
    // Given
    const id = TEST_ORGANIZATIONS.FILIGRAN.ID;
    const input: OrganizationInput = { name: 'Updated Org' };
    const expected = { id, name: 'Updated Org' } as unknown as Awaited<
      ReturnType<typeof OrganizationApp.updateOrganization>
    >;
    vi.spyOn(OrganizationApp, 'updateOrganization').mockResolvedValue(expected);

    // When
    const result = await organizationsResolver.Mutation!.editOrganization!(
      {},
      { id, input },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(OrganizationApp.updateOrganization).toHaveBeenCalledWith(id, input);
    expect(result).toMatchObject({ id, name: 'Updated Org' });
  });

  it('should map to BadRequest for InvalidEmail error', async () => {
    // Given
    const id = TEST_ORGANIZATIONS.FILIGRAN.ID;
    vi.spyOn(OrganizationApp, 'updateOrganization').mockRejectedValue(
      new Error(BadRequestErrorCode.InvalidEmail)
    );

    // When
    const call = organizationsResolver.Mutation!.editOrganization!(
      {},
      { id, input: { name: 'Updated Org' } },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    await expect(call).rejects.toMatchObject({ name: ErrorType.BadRequest });
  });
});

describe('delete organization GraphQL mutation', () => {
  it('should delegate to organizationApp.deleteOrganization and return deleted organization', async () => {
    // Given
    const id = TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID;
    const expected = { id, name: 'Deleted Org' } as unknown as Awaited<
      ReturnType<typeof OrganizationApp.deleteOrganization>
    >;
    vi.spyOn(OrganizationApp, 'deleteOrganization').mockResolvedValue(expected);

    // When
    const result = await organizationsResolver.Mutation!.deleteOrganization!(
      {},
      { id },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(OrganizationApp.deleteOrganization).toHaveBeenCalledWith(id);
    expect(result).toMatchObject({ id });
  });

  it('should map to ForbiddenAccess for CantRemoveLastAdministrator error', async () => {
    // Given
    const id = TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID;
    vi.spyOn(OrganizationApp, 'deleteOrganization').mockRejectedValue(
      new Error(ForbiddenErrorCode.CantRemoveLastAdministrator)
    );

    // When
    const call = organizationsResolver.Mutation!.deleteOrganization!(
      {},
      { id },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    await expect(call).rejects.toMatchObject({
      name: ErrorType.ForbiddenAccess,
    });
  });

  it('should throw StillReferencedError when error message includes STILL_IN_ORGANIZATION', async () => {
    // Given
    const id = TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID;
    vi.spyOn(OrganizationApp, 'deleteOrganization').mockRejectedValue(
      new Error('STILL_IN_ORGANIZATION')
    );

    // When
    const call = organizationsResolver.Mutation!.deleteOrganization!(
      {},
      { id },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    await expect(call).rejects.toMatchObject({
      name: ErrorType.StillReference,
    });
  });
});

describe('organization administrator_emails field resolver', () => {
  it('should return the emails of the organization administrators', async () => {
    // Given
    const id = TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID;
    const email = TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.EMAIL;
    vi.spyOn(
      UserDomain,
      'loadUsersByCapabilitiesInOrganization'
    ).mockResolvedValue([{ email } as User]);

    // When
    const result = await (
      organizationsResolver.Organization as OrganizationResolvers
    ).administrator_emails!(
      { id, name: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.NAME } as Organization,
      {},
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(
      UserDomain.loadUsersByCapabilitiesInOrganization
    ).toHaveBeenCalledWith(id, [
      OrganizationCapability.AdministrateOrganization,
    ]);
    expect(result).toEqual([email]);
  });
});
