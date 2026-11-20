import { ApolloServer } from '@apollo/server';
import { GraphQLObjectType } from 'graphql';
import { toGlobalId } from 'graphql-relay/node/node.js';
import { v4 as uuidv4 } from 'uuid';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import { CAPABILITY_READ_ORGANIZATION_MEMBERS } from '../../../../tests/tests.const';
import {
  ApiTokenScope,
  OrganizationCapability,
  UserAccountStatus,
} from '../../../__generated__/resolvers-types';
import { requestContext } from '../../../context/request.context';
import Organization, {
  OrganizationId,
} from '../../../model/kanel/public/Organization';
import User, { UserId, UserMutator } from '../../../model/kanel/public/User';
import { PortalContext } from '../../../model/portal-context';
import { UserLoadUserBy } from '../../../model/user';
import { CAPABILITY_BYPASS } from '../../../portal.const';
import { Context } from '../../../server/apollo-plugins/log';
import { createApolloServer } from '../../../server/apollo-server';
import createSchema from '../../../server/graphql-schema';
import { narrowUserToToken } from '../../api-token/api-token.auth';
import { UserDomain } from '../user/user-domain/user.domain';
import { OrganizationDataLoader } from './organization.dataloader';
import { OrganizationDomain } from './organization.domain';

// executeOperation skips the Express middleware that rewrites a global `id` variable with fromGlobalId: no effect
// here, the argument is named organizationId and decoded by the OrganizationId scalar alone
const ORGANIZATION_MEMBERS_QUERY = `query ($organizationId: OrganizationId!) {
  organizationMembers(organizationId: $organizationId, first: 100) {
    totalCount
    edges { node { id email last_name capabilities } }
  }
}`;

const ORGANIZATION_NOT_FOUND_ERROR = {
  message: 'ORGANIZATION_NOT_FOUND',
  extensions: { code: 'NOT_FOUND' },
};

const buildContext = (user: UserLoadUserBy | undefined): PortalContext =>
  ({
    user,
    dataLoaders: { organization: OrganizationDataLoader.create() },
  }) as PortalContext;

describe('organizationMembers GraphQL schema', () => {
  const schema = createSchema();
  const server: ApolloServer<Context> = createApolloServer({
    schema,
    exposeSchemaDetails: false,
  });
  const createdUserIds: UserId[] = [];
  const createdOrganizationIds: OrganizationId[] = [];
  let organizationA: Organization;
  let organizationB: Organization;
  // Member of no organization, made BYPASS or READ_ORGANIZATION_MEMBERS by the tests that need it
  let outsider: User;

  const createOrganization = async (data?: Partial<Organization>) => {
    const organization = await TestHelper.organization.create(data);
    createdOrganizationIds.push(organization.id);
    return organization;
  };

  const addMember = async (
    organization: Organization,
    fields: UserMutator = {},
    capabilities: OrganizationCapability[] = []
  ) => {
    const { user, userOrganization } =
      await TestHelper.user.insertInOrganization(organization.id, fields);
    createdUserIds.push(user.id);
    for (const name of capabilities) {
      await TestHelper.user_OrganizationCapability.create({
        user_organization_id: userOrganization.id,
        name,
      });
    }
    return user;
  };

  const createPersonalSpace = async () => {
    const owner = await TestHelper.user.insert({
      email: `owner-${uuidv4()}@admin-hub.test`,
    });
    createdUserIds.push(owner.id);
    const personalSpace = await createOrganization({
      id: owner.id as unknown as OrganizationId,
      name: owner.email,
      personal_space: true,
    });
    await TestHelper.user_Organization.create({
      user_id: owner.id,
      organization_id: personalSpace.id,
    });
    return { owner, personalSpace };
  };

  // The resolvers read the caller from requestContext, the @auth directive from the GraphQL context: both get it
  const execute = async (
    caller: UserLoadUserBy | undefined,
    query: string,
    variables: Record<string, unknown>
  ) => {
    requestContext.set({ user: caller });
    const response = await server.executeOperation(
      { query, variables },
      { contextValue: buildContext(caller) }
    );
    if (response.body.kind !== 'single') {
      throw new Error('Expected a single GraphQL response');
    }
    return response.body.singleResult;
  };

  const queryMembers = (
    caller: UserLoadUserBy | undefined,
    organizationId: string
  ) => execute(caller, ORGANIZATION_MEMBERS_QUERY, { organizationId });

  const withoutPosition = ({
    path: _path,
    locations: _locations,
    ...error
  }: {
    path?: unknown;
    locations?: unknown;
  }) => error;

  beforeAll(async () => {
    await server.start();
  });

  beforeEach(async () => {
    organizationA = await createOrganization();
    organizationB = await createOrganization();
    outsider = await TestHelper.user.insert({
      email: `outsider-${uuidv4()}@admin-hub.test`,
    });
    createdUserIds.push(outsider.id);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    // Deleting the users cascades to their memberships, capabilities and pending requests
    for (const id of createdUserIds.splice(0)) {
      await TestHelper.user.delete({ id });
    }
    for (const id of createdOrganizationIds.splice(0)) {
      await TestHelper.organization.delete({ id });
    }
  });

  afterAll(async () => {
    await server.stop();
  });

  it('should refuse an anonymous caller without loading any member', async () => {
    // Given
    const memberConnectionSpy = vi.spyOn(
      UserDomain,
      'loadOrganizationMemberConnection'
    );

    // When
    const { data, errors } = await queryMembers(undefined, organizationA.id);

    // Then
    expect(errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
    expect(data).toBeNull();
    expect(memberConnectionSpy).not.toHaveBeenCalled();
  });

  it('should return the requested fields of the members of their organization to a member', async () => {
    // Given
    const caller = await addMember(organizationA, { last_name: 'Caller' });
    const administrator = await addMember(
      organizationA,
      { last_name: 'Administrator' },
      [OrganizationCapability.AdministrateOrganization]
    );

    // When
    const { data, errors } = await queryMembers(
      TestHelper.caller.build(caller, [organizationA]),
      organizationA.id
    );

    // Then
    expect(errors).toBeUndefined();
    expect(data).toEqual({
      organizationMembers: {
        totalCount: 2,
        edges: [
          {
            node: {
              id: toGlobalId('User', administrator.id),
              email: administrator.email,
              last_name: 'Administrator',
              capabilities: [OrganizationCapability.AdministrateOrganization],
            },
          },
          {
            node: {
              id: toGlobalId('User', caller.id),
              email: caller.email,
              last_name: 'Caller',
              capabilities: [],
            },
          },
        ],
      },
    });
  });

  it.each([
    [
      'another organization, to a member of organization A',
      async () => ({
        caller: TestHelper.caller.build(await addMember(organizationA), [
          organizationA,
        ]),
        organizationId: organizationB.id as string,
      }),
    ],
    [
      'an unknown UUID',
      async () => ({
        caller: TestHelper.caller.build(await addMember(organizationA), [
          organizationA,
        ]),
        organizationId: uuidv4(),
      }),
    ],
    [
      'an id that is not a UUID',
      async () => ({
        caller: TestHelper.caller.build(await addMember(organizationA), [
          organizationA,
        ]),
        organizationId: 'not-a-uuid',
      }),
    ],
    [
      'a personal space, to a user with READ_ORGANIZATION_MEMBERS',
      async () => ({
        caller: TestHelper.caller.build(
          outsider,
          [],
          [CAPABILITY_READ_ORGANIZATION_MEMBERS]
        ),
        organizationId: (await createPersonalSpace()).personalSpace
          .id as string,
      }),
    ],
    [
      'another organization of the user, to an API token restricted to organization A',
      async () => {
        const user = await addMember(organizationA);
        await TestHelper.user_Organization.create({
          user_id: user.id,
          organization_id: organizationB.id,
        });
        return {
          caller: narrowUserToToken(
            TestHelper.caller.build(user, [organizationA, organizationB]),
            {
              scope: ApiTokenScope.ReadWrite,
              organization_id: organizationA.id,
            }
          ),
          organizationId: organizationB.id as string,
        };
      },
    ],
  ])(
    'should answer exactly ORGANIZATION_NOT_FOUND for %s',
    async (_, prepare) => {
      // Given
      const { caller, organizationId } = await prepare();

      // When
      const { data, errors } = await queryMembers(caller, organizationId);

      // Then
      expect(data).toBeNull();
      expect(errors?.map(withoutPosition)).toEqual([
        ORGANIZATION_NOT_FOUND_ERROR,
      ]);
    }
  );

  it('should answer the same members to a raw UUID and to an Organization global id', async () => {
    // Given
    const caller = await addMember(organizationA);
    await addMember(organizationA);
    const callerInA = TestHelper.caller.build(caller, [organizationA]);

    // When
    const byRawId = await queryMembers(callerInA, organizationA.id);
    const byGlobalId = await queryMembers(
      callerInA,
      toGlobalId('Organization', organizationA.id)
    );

    // Then
    expect(byRawId.errors).toBeUndefined();
    expect(byGlobalId).toEqual(byRawId);
  });

  it('should refuse the global id of another type before loading anything', async () => {
    // Given
    const caller = await addMember(organizationA);
    const readableOrganizationSpy = vi.spyOn(
      OrganizationDomain,
      'loadOrganizationWhoseMembersAreReadableBy'
    );
    const memberConnectionSpy = vi.spyOn(
      UserDomain,
      'loadOrganizationMemberConnection'
    );

    // When
    const { data, errors } = await queryMembers(
      TestHelper.caller.build(caller, [organizationA]),
      toGlobalId('User', organizationA.id)
    );

    // Then
    expect(data).toBeUndefined();
    expect(errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT');
    expect(readableOrganizationSpy).not.toHaveBeenCalled();
    expect(memberConnectionSpy).not.toHaveBeenCalled();
  });

  it('should return the members of any organization to a user with READ_ORGANIZATION_MEMBERS who is not a member', async () => {
    // Given
    const member = await addMember(organizationA);

    // When
    const { data, errors } = await queryMembers(
      TestHelper.caller.build(
        outsider,
        [],
        [CAPABILITY_READ_ORGANIZATION_MEMBERS]
      ),
      organizationA.id
    );

    // Then
    expect(errors).toBeUndefined();
    expect(data).toMatchObject({
      organizationMembers: {
        totalCount: 1,
        edges: [{ node: { id: toGlobalId('User', member.id) } }],
      },
    });
  });

  it('should return the member of a personal space to a BYPASS user', async () => {
    // Given
    const { owner, personalSpace } = await createPersonalSpace();

    // When
    const { data, errors } = await queryMembers(
      TestHelper.caller.build(outsider, [], [CAPABILITY_BYPASS]),
      personalSpace.id
    );

    // Then
    expect(errors).toBeUndefined();
    expect(data).toMatchObject({
      organizationMembers: {
        totalCount: 1,
        edges: [{ node: { id: toGlobalId('User', owner.id) } }],
      },
    });
  });

  it('should expose exactly the id, the email, the names and the capabilities of a member', () => {
    // Given
    const type = schema.getType('OrganizationMember') as GraphQLObjectType;

    // When
    const fields = Object.keys(type.getFields());

    // Then
    expect(fields.sort()).toEqual([
      'capabilities',
      'email',
      'first_name',
      'id',
      'last_name',
    ]);
  });

  it('should count the same members as members_count', async () => {
    // Given
    await addMember(organizationA);
    await addMember(organizationA, { status: UserAccountStatus.Invited });
    await addMember(organizationA, { disabled: true }, [
      OrganizationCapability.ManageAccess,
      OrganizationCapability.ManageSubscription,
    ]);
    const pendingUser = await TestHelper.user.insertWithPendingOrganization(
      { email: `pending-${uuidv4()}@admin-hub.test` },
      organizationA.id
    );
    createdUserIds.push(pendingUser.id);

    // When
    const { data, errors } = await execute(
      TestHelper.caller.build(
        outsider,
        [],
        [CAPABILITY_READ_ORGANIZATION_MEMBERS]
      ),
      `query ($organizationId: OrganizationId!, $id: ID!) {
        organizationMembers(organizationId: $organizationId, first: 1) { totalCount }
        organization(id: $id) { members_count }
      }`,
      { organizationId: organizationA.id, id: organizationA.id }
    );

    // Then
    expect(errors).toBeUndefined();
    expect(data).toEqual({
      organizationMembers: { totalCount: 3 },
      organization: { members_count: 3 },
    });
  });

  it('should return no member but the exact totalCount for a page of 0', async () => {
    // Given
    const caller = await addMember(organizationA);
    await addMember(organizationA);

    // When
    const { data, errors } = await execute(
      TestHelper.caller.build(caller, [organizationA]),
      `query ($organizationId: OrganizationId!) {
        organizationMembers(organizationId: $organizationId, first: 0) {
          totalCount
          edges { node { id } }
        }
      }`,
      { organizationId: organizationA.id }
    );

    // Then
    expect(errors).toBeUndefined();
    expect(data).toEqual({ organizationMembers: { totalCount: 2, edges: [] } });
  });

  it('should refuse a negative page size with INVALID_PAGE_SIZE without loading any member', async () => {
    // Given
    const caller = await addMember(organizationA);
    const memberConnectionSpy = vi.spyOn(
      UserDomain,
      'loadOrganizationMemberConnection'
    );

    // When
    const { data, errors } = await execute(
      TestHelper.caller.build(caller, [organizationA]),
      `query ($organizationId: OrganizationId!) {
        organizationMembers(organizationId: $organizationId, first: -1) {
          totalCount
        }
      }`,
      { organizationId: organizationA.id }
    );

    // Then
    // extensions.code is not asserted: BadRequestError sets none, so Apollo answers INTERNAL_SERVER_ERROR for every
    // BadRequestErrorCode, a defect of the shared error builder outside this query
    expect(data).toBeNull();
    expect(errors?.map(({ message }) => message)).toEqual([
      'INVALID_PAGE_SIZE',
    ]);
    expect(memberConnectionSpy).not.toHaveBeenCalled();
  });
});
