import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import {
  contextSimpleUserFiligran2,
  GRAPHQL_RESOLVE_INFO,
  TEST_ORGANIZATIONS,
} from '../../../../tests/tests.const';
import {
  ApiTokenScope,
  OrderingMode,
  Organization,
  OrganizationConnection,
  OrganizationEdge,
  OrganizationInput,
  OrganizationOrdering,
  OrganizationResolvers,
  PageInfo,
} from '../../../__generated__/resolvers-types';
import { requestContext } from '../../../context/request.context';
import OrganizationRow, {
  OrganizationId,
} from '../../../model/kanel/public/Organization';
import { UserId } from '../../../model/kanel/public/User';
import {
  AlreadyExistsErrorCode,
  BadRequestErrorCode,
  ForbiddenErrorCode,
} from '../../../utils/error/error.code';
import { ErrorType } from '../../../utils/error/error.type';
import { UserDomain } from '../user/user-domain/user.domain';
import { OrganizationApp } from './organization.app';
import { OrganizationDataLoaders } from './organization.dataloader';
import { OrganizationDomain } from './organization.domain';
import organizationsResolver from './organization.resolver';

describe('organization GraphQL query', () => {
  it('should load organization by id and return result', async () => {
    // Given
    const id = TEST_ORGANIZATIONS.FILIGRAN.ID;
    const expected = { id, name: 'Filigran' } as unknown as Awaited<
      ReturnType<typeof OrganizationDomain.loadFirstProfessionalOrganizationBy>
    >;
    vi.spyOn(
      OrganizationDomain,
      'loadFirstProfessionalOrganizationBy'
    ).mockResolvedValue(expected);

    // When
    const result = await organizationsResolver.Query!.organization!(
      {},
      { id },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(
      OrganizationDomain.loadFirstProfessionalOrganizationBy
    ).toHaveBeenCalledWith({ id });
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

describe('user organizations GraphQL query of a user in two organizations', () => {
  let tokenOrganization: OrganizationRow;
  let otherOrganization: OrganizationRow;
  let userId: UserId;

  const loadUserOrganizations = () =>
    organizationsResolver.Query!.userOrganizations!(
      {},
      {},
      { ...contextSimpleUserFiligran2, user: requestContext.requireUser() },
      GRAPHQL_RESOLVE_INFO
    );

  beforeEach(async () => {
    tokenOrganization = await TestHelper.organization.create();
    otherOrganization = await TestHelper.organization.create();
    const { user } = await TestHelper.user.insertInOrganization(
      tokenOrganization.id,
      {
        email: `user-organizations-${uuidv4()}@user-organizations-test.io`,
        selected_organization_id: tokenOrganization.id,
      }
    );
    userId = user.id;
    await TestHelper.user_Organization.create({
      user_id: userId,
      organization_id: otherOrganization.id,
    });
  });

  afterEach(async () => {
    await TestHelper.user.delete({ id: userId });
    await TestHelper.organization.delete({ id: tokenOrganization.id });
    await TestHelper.organization.delete({ id: otherOrganization.id });
  });

  it('should list both organizations for a session', async () => {
    // Given
    requestContext.set({
      user: (await UserDomain.loadUserBy({ 'User.id': userId }))!,
    });

    // When
    const organizations = await loadUserOrganizations();

    // Then
    expect(organizations).toHaveLength(2);
    expect(organizations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: tokenOrganization.id,
          name: tokenOrganization.name,
        }),
        expect.objectContaining({
          id: otherOrganization.id,
          name: otherOrganization.name,
        }),
      ])
    );
  });

  it.each([ApiTokenScope.Read, ApiTokenScope.ReadWrite, ApiTokenScope.Admin])(
    'should list only the token organization for a %s token',
    async (scope) => {
      // Given
      await TestHelper.apiToken.actAs(userId, tokenOrganization.id, scope);

      // When
      const organizations = await loadUserOrganizations();

      // Then
      expect(organizations).toMatchObject([
        { id: tokenOrganization.id, name: tokenOrganization.name },
      ]);
    }
  );
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
  it('should load the administrator emails through the request-scoped dataloader', async () => {
    // Given
    const id = TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID;
    const email = TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.EMAIL;
    const load = vi.fn().mockResolvedValue([email]);
    const context = {
      ...contextSimpleUserFiligran2,
      dataLoaders: {
        ...contextSimpleUserFiligran2.dataLoaders,
        organization: {
          administratorEmailsByOrganizationIdLoader: { load },
        } as unknown as OrganizationDataLoaders,
      },
    };

    // When
    const result = await (
      organizationsResolver.Organization as OrganizationResolvers
    ).administrator_emails!(
      { id, name: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.NAME } as Organization,
      {},
      context,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(load).toHaveBeenCalledWith(id);
    expect(result).toEqual([email]);
  });
});
