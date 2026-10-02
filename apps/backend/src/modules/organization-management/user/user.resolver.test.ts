import { MockInstance } from '@vitest/spy';
import { GraphQLResolveInfo } from 'graphql';
import { toGlobalId } from 'graphql-relay/node/node.js';
import { v4 as uuidv4 } from 'uuid';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { SubscriptionSpy } from '../../../../tests/test-utils';
import {
  contextAdminSecondOrga,
  // eslint-disable-next-line no-restricted-imports
  contextBypassUser,
  contextSimpleUserFiligran2,
  contextSimpleUserSecondOrga,
  GRAPHQL_RESOLVE_INFO,
  requestContextAdminSecondOrga,
  // eslint-disable-next-line no-restricted-imports
  requestContextAdminUser,
  requestContextSimpleUserSecondOrga,
  TEST_ORGANIZATIONS,
} from '../../../../tests/tests.const';
import {
  AddUserInput,
  FilterKey,
  OrderingMode,
  Organization,
  UserOrdering,
} from '../../../__generated__/resolvers-types';
import { requestContext } from '../../../context/request.context';
import { UserId } from '../../../model/kanel/public/User';
import { PortalContext } from '../../../model/portal-context';
import { UserLoadUserBy } from '../../../model/user';
import { auth0ClientMock } from '../../../thirdparty/auth0/mock';
import { loginFromProvider } from '../../security-management/authentication/auth-user';
import { UserAdminApp } from './user-admin/user.admin.app';
import { UserDomain } from './user-domain/user.domain';
import { UserOrganizationApp } from './user-organization/user-organization.app';
import { UserOrganizationDomain } from './user-organization/user-organization.domain';
import { UserOrganizationPendingDomain } from './user-pending/user-organization-pending.domain';
import { UserHelper } from './user.helper';
import usersResolver from './user.resolver';

describe('user query resolver', () => {
  describe('listPendingUser', () => {
    it('should list pending users from any organization for bypass', async () => {
      const testContext = {
        ...contextBypassUser,
        user: {
          ...contextBypassUser.user,
          selected_organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        },
      };
      requestContext.set({
        user: testContext.user,
      });
      const email = `testPending${uuidv4()}@second-orga.com`;
      const pendingUser = await loginFromProvider({
        email: email,
        first_name: 'test',
        last_name: 'pending',
        roles: [],
      });

      const options = {
        first: 50,
        orderMode: OrderingMode.Asc,
        orderBy: UserOrdering.FirstName,
        filters: [],
      };

      const response = await usersResolver.Query!.pendingUsers!(
        {},
        options,
        testContext,
        GRAPHQL_RESOLVE_INFO
      );
      expect(response.totalCount).toBe('1');
      expect(response.edges[0]!.node.id).toBe(pendingUser.id);

      requestContext.set(requestContextAdminUser);
      await UserHelper.removeUser({ email: pendingUser.email });
    });
    it('should list pending users from the orga if orga filter exists', async () => {
      const testContext = {
        ...contextAdminSecondOrga,
        user: {
          ...contextAdminSecondOrga.user,
          selected_organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        },
      };
      const pendingUserSecondOrga = await loginFromProvider({
        email: `testPending${uuidv4()}@second-orga.com`,
        first_name: 'secondOrga',
        last_name: 'pending',
        roles: [],
      });
      const pendingUserFiligran = await loginFromProvider({
        email: `testPending${uuidv4()}@filigran.io`,
        first_name: 'filigran',
        last_name: 'pending',
        roles: [],
      });

      const options = {
        first: 50,
        orderMode: OrderingMode.Asc,
        orderBy: UserOrdering.FirstName,
        filters: [
          {
            key: FilterKey.OrganizationId,
            value: [
              toGlobalId(
                'Organization',
                TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
              ),
            ],
          },
        ],
      };
      requestContext.set({
        user: testContext.user,
      });
      const response = await usersResolver.Query!.pendingUsers!(
        {},
        options,
        testContext,
        GRAPHQL_RESOLVE_INFO
      );

      expect(response.totalCount).toBe('1');
      expect(response.edges[0]!.node.id).toBe(pendingUserSecondOrga.id);

      requestContext.set(requestContextAdminUser);
      await UserHelper.removeUser({ email: pendingUserSecondOrga.email });
      await UserHelper.removeUser({ email: pendingUserFiligran.email });
    });
    it('should list pending users in the user orga even if no filter is specified', async () => {
      const testContext = {
        ...contextAdminSecondOrga,
        user: {
          ...contextAdminSecondOrga.user,
          selected_organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        },
      };
      const pendingUserSecondOrga = await loginFromProvider({
        email: `testPending${uuidv4()}@second-orga.com`,
        first_name: 'secondOrga',
        last_name: 'pending',
        roles: [],
      });
      const pendingUserFiligran = await loginFromProvider({
        email: `testPending${uuidv4()}@filigran.io`,
        first_name: 'filigran',
        last_name: 'pending',
        roles: [],
      });

      const options = {
        first: 50,
        orderMode: OrderingMode.Asc,
        orderBy: UserOrdering.FirstName,
        filters: [],
      };

      requestContext.set({
        user: testContext.user,
      });
      const response = await usersResolver.Query!.pendingUsers!(
        {},
        options,
        testContext,
        GRAPHQL_RESOLVE_INFO
      );

      expect(response.totalCount).toBe('1');
      expect(response.edges[0]!.node.id).toBe(pendingUserSecondOrga.id);

      requestContext.set(requestContextAdminUser);
      await UserHelper.removeUser({ email: pendingUserSecondOrga.email });
      await UserHelper.removeUser({ email: pendingUserFiligran.email });
    });
  });
});

describe('user mutation resolver', () => {
  it('should be login', async () => {
    // When
    // @ts-ignore
    const response = await usersResolver.Mutation.login(
      undefined,
      {
        email: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.EMAIL,
        password: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.PASSWORD,
      },
      {
        req: {
          session: {
            user: {},
          },
        },
        res: {
          cookie: vi.fn(),
        },
      }
    );
    // Then
    expect(response).toBeTruthy();
  });

  describe('adminAddUser', () => {
    it('should not create an existing user', async () => {
      // Given
      try {
        // @ts-ignore
        await usersResolver.Mutation.adminAddUser(
          undefined,
          {
            input: {
              email: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.EMAIL,
              password: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.PASSWORD,
            } as AddUserInput,
          },
          contextBypassUser
        );
      } catch (error) {
        // Should throw an error and catch it.
        // As we do not use a running server we need to catch the error
        // otherwise it would be send in the graphql response as an error.
        expect(error).toBeTruthy();
      }
    });
    it('should not partially create a user if an error occurs', async () => {
      // Given
      const testEmail = 'testRollback@company.com';
      try {
        vi.spyOn(
          UserOrganizationDomain,
          'assignUserOrgCapabilities'
        ).mockImplementation(() => {
          throw new Error('Test error');
        });
        const testEmail = 'testRollback@company.com';
        // When
        // @ts-ignore
        await usersResolver.Mutation.adminAddUser(
          undefined,
          {
            input: {
              email: testEmail,
              password: 'fake password',
            } as AddUserInput,
          },
          contextBypassUser
        );
      } catch (error) {
        // Then
        // Should throw an error and catch it.
        // As we do not use a running server we need to catch the error
        // otherwise it would be send in the graphql response as an error.
        expect(error).toBeTruthy();
      }
      const user = await UserDomain.loadUserBy({ 'User.email': testEmail });
      expect(user).toBeUndefined();
    });

    it('should should send a add event in sse', async () => {
      // Given
      const filigranSpy = new SubscriptionSpy();
      const secondOrgaSpy = new SubscriptionSpy();
      // @ts-ignore
      await filigranSpy.spy(
        usersResolver.Subscription!.User,
        {
          organizationId: toGlobalId(
            'Organization',
            TEST_ORGANIZATIONS.FILIGRAN.ID
          ),
        },
        contextBypassUser,
        ['add']
      );

      await secondOrgaSpy.spy(
        usersResolver.Subscription!.User,
        {
          organizationId: toGlobalId(
            'Organization',
            TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
          ),
        },
        contextAdminSecondOrga,
        ['add']
      );

      const email = 'sseEventAddUser@filigran.io';
      // When

      // @ts-ignore
      await usersResolver.Mutation.adminAddUser(
        undefined,
        {
          input: {
            email: email,
            password: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.PASSWORD,
            organization_capabilities: [
              {
                organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
                capabilities: [],
              },
            ],
          } as AddUserInput,
        },
        contextBypassUser
      );

      // Then
      const events = await filigranSpy.waitForEvents(1);

      expect(events).toHaveLength(1);
      expect(events[0].User.add.email).toBe(email);
      await secondOrgaSpy.expectNoEvents();

      await filigranSpy.cleanup();
      await secondOrgaSpy.cleanup();
    });

    describe('create user with personal space', async () => {
      let user: UserLoadUserBy;
      let organizations: Organization[];
      beforeAll(async () => {
        const testMail = `testAddUser${uuidv4()}@test.fr`;
        // @ts-ignore
        const response = await usersResolver.Mutation.adminAddUser(
          undefined,
          {
            input: {
              email: testMail,
              password: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.PASSWORD,
            } as AddUserInput,
          },
          contextBypassUser
        );
        expect(response).toBeTruthy();

        user = (await UserDomain.loadUserBy({
          'User.id': response!.id as UserId,
        }))!;
        // @ts-ignore
        organizations = await usersResolver.User!.organizations!(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          user as any,
          {},
          contextBypassUser,
          GRAPHQL_RESOLVE_INFO
        );
      });
      it('should have only one organization Personal space', async () => {
        expect(organizations).toHaveLength(1);
      });

      it('should User.Id is equal to Organization.Id', async () => {
        expect(user.id).toEqual(organizations[0]!.id);
      });
    });

    describe('as Admin - should create user with personal space and add to internal organization', async () => {
      let response: { id: string } | undefined;
      let organizations: Organization[];
      let user: UserLoadUserBy;
      beforeAll(async () => {
        requestContext.set(requestContextAdminUser);

        const testMail = `testAddUser${uuidv4()}@${TEST_ORGANIZATIONS.FILIGRAN.DOMAINS.FIRST}.fr`;
        // @ts-ignore
        response = await usersResolver.Mutation.adminAddUser(
          undefined,
          {
            input: {
              email: testMail,
              password: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.PASSWORD,
              organization_capabilities: [
                {
                  organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
                  capabilities: [],
                },
              ],
            } as AddUserInput,
          },
          contextBypassUser
        );
        expect(response).toBeTruthy();
        user = (await UserDomain.loadUserBy({
          'User.id': response!.id as UserId,
        }))!;
        // @ts-ignore
        organizations = await usersResolver.User!.organizations!(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          user as any,
          {},
          contextBypassUser,
          GRAPHQL_RESOLVE_INFO
        );
      });

      afterAll(async () => {
        if (response)
          await UserDomain.deleteUserBy({ id: response.id as UserId });
      });

      it('should have Personal space and Internal as organization', async () => {
        expect(
          organizations.some((org) => org.id === TEST_ORGANIZATIONS.FILIGRAN.ID)
        ).toBeTruthy();
        expect(
          organizations.some((org) => org.id.toString() === user.id.toString())
        ).toBeTruthy();

        expect(organizations).toHaveLength(2);
      });
    });
    it('as Admin Organization - should not able to create user with different email domain', async () => {
      const testMail = `testAddUser${uuidv4()}@test.fr`;
      try {
        requestContext.set(requestContextAdminSecondOrga);
        // @ts-ignore
        await usersResolver.Mutation.adminAddUser(
          undefined,
          {
            input: {
              email: testMail,
              password: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.PASSWORD,
              organization_capabilities: [
                {
                  organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
                  capabilities: [],
                },
              ],
            } as AddUserInput,
          },
          contextAdminSecondOrga
        );
      } catch (error) {
        const user = await UserDomain.loadUserBy({ 'User.email': testMail });
        expect(user).toBeFalsy();
        expect(error).toBeTruthy();
      }
    });
    describe('as Admin orga - should create user with personal space and add to ORGANIZATIONS_TEST.SECOND_ORGANIZATION.NAME organization', async () => {
      let user: UserLoadUserBy;
      let organizations: Organization[];
      let response: { id: string } | undefined;
      beforeAll(async () => {
        const testMail = `testAddUser${uuidv4()}@second-orga.com`;
        requestContext.set(requestContextAdminSecondOrga);
        // @ts-ignore
        response = await usersResolver.Mutation.adminAddUser(
          undefined,
          {
            input: {
              email: testMail,
              password: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.PASSWORD,
              organization_capabilities: [
                {
                  organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
                  capabilities: [],
                },
              ],
            } as AddUserInput,
          },
          contextAdminSecondOrga
        );
        user = (await UserDomain.loadUserBy({
          'User.id': response!.id as UserId,
        }))!;

        requestContext.set(requestContextAdminUser);
        // @ts-ignore
        organizations = await usersResolver.User!.organizations!(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          user as any,
          {},
          contextAdminSecondOrga,
          GRAPHQL_RESOLVE_INFO
        );

        expect(response).toBeTruthy();
      });

      afterAll(async () => {
        await UserDomain.deleteUserBy({ id: response!.id as UserId });
      });

      it('should have Personal space and ORGANIZATIONS_TEST.SECOND_ORGANIZATION.NAME as organization', async () => {
        expect(
          organizations.some(
            (org) => org.id === TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
          )
        ).toBeTruthy();
        expect(
          organizations.some((org) => org.id.toString() === user.id.toString())
        ).toBeTruthy();

        expect(organizations).toHaveLength(2);
      });
    });
  });

  describe('adminEditUser', () => {
    it('should delegate to UserAdminApp.editUser and return the result', async () => {
      const mockUser = {
        id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE.ID,
        email: 'user@test.com',
      };
      vi.spyOn(UserAdminApp, 'editUser').mockResolvedValue(mockUser as never);

      // @ts-expect-error adminEditUser is not considered as callable
      const result = await usersResolver.Mutation!.adminEditUser!(
        undefined,
        { id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE.ID, input: {} },
        contextBypassUser
      );

      expect(UserAdminApp.editUser).toHaveBeenCalledWith({
        userId: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE.ID,
        input: {},
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('deleteUser', () => {
    it('should delegate to UserAdminApp.deleteUser and map the deleted user', async () => {
      const deletedUser = {
        id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE.ID,
        email: 'deleted-user@test.io',
        selected_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
      } as UserLoadUserBy;
      const deleteUserSpy = vi
        .spyOn(UserAdminApp, 'deleteUser')
        .mockResolvedValue(deletedUser as never);

      // @ts-expect-error deleteUser is not considered as callable
      const result = await usersResolver.Mutation!.deleteUser!(
        undefined,
        { id: deletedUser.id },
        contextBypassUser,
        GRAPHQL_RESOLVE_INFO
      );

      expect(deleteUserSpy).toHaveBeenCalledWith(deletedUser.id);
      expect(result).toMatchObject({
        id: deletedUser.id,
        email: deletedUser.email,
      });

      deleteUserSpy.mockRestore();
    });

    it('should propagate a mapped graphql error when deletion fails', async () => {
      const deleteUserSpy = vi
        .spyOn(UserAdminApp, 'deleteUser')
        .mockRejectedValue(new Error('boom'));

      // @ts-expect-error deleteUser is not considered as callable
      const call = usersResolver.Mutation!.deleteUser!(
        undefined,
        { id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE.ID },
        contextBypassUser,
        GRAPHQL_RESOLVE_INFO
      );

      await expect(call).rejects.toBeInstanceOf(Error);

      deleteUserSpy.mockRestore();
    });
  });

  describe('editUserCapabilities', () => {
    let secondOrgaUser: UserLoadUserBy;

    beforeAll(async () => {
      secondOrgaUser = (await UserDomain.loadUserBy({
        email: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.EMAIL,
      }))!;
    });

    afterEach(async () => {
      requestContext.set(requestContextAdminUser);
      await usersResolver.Mutation!.adminEditUser!(
        {},
        {
          id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID,
          input: {
            first_name: secondOrgaUser.first_name,
            organization_capabilities:
              secondOrgaUser.organization_capabilities!.map(
                (organizationCapabilities) => ({
                  organization_id: organizationCapabilities.organization.id,
                  capabilities: organizationCapabilities.capabilities,
                })
              ),
          },
        },
        contextBypassUser,
        GRAPHQL_RESOLVE_INFO
      );
    });

    it('should prevent deletion of the last organization administrator', async () => {
      const testContext = {
        ...contextBypassUser,
        user: {
          ...contextBypassUser.user,
          selected_organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        },
      };
      requestContext.set({
        user: testContext.user,
      });
      const call = usersResolver.Mutation!.editUserCapabilities!(
        {},
        {
          id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID,
          input: { capabilities: [] },
        },
        testContext,
        GRAPHQL_RESOLVE_INFO
      );

      await expect(call).rejects.toThrow('CANT_REMOVE_LAST_ADMINISTRATOR');
    });

    it('should edit capabilities', async () => {
      expect(secondOrgaUser.selected_org_capabilities).not.toContain(
        'MANAGE_PLATFORM_REGISTRATION'
      );

      const testContext = {
        ...contextAdminSecondOrga,
        user: {
          ...contextAdminSecondOrga.user,
          selected_organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        },
      };
      requestContext.set({
        user: testContext.user,
      });
      await usersResolver.Mutation!.editUserCapabilities!(
        {},
        {
          id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID,
          input: {
            capabilities: [
              'MANAGE_PLATFORM_REGISTRATION',
              'ADMINISTRATE_ORGANIZATION',
            ],
          },
        },
        testContext,
        GRAPHQL_RESOLVE_INFO
      );
      secondOrgaUser = (await UserDomain.loadUserBy({
        email: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.EMAIL,
      }))!;
      expect(secondOrgaUser.selected_org_capabilities).toContain(
        'MANAGE_PLATFORM_REGISTRATION'
      );
      // Put back the original capabilities
      await usersResolver.Mutation!.editUserCapabilities!(
        {},
        {
          id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID,
          input: {
            capabilities: ['ADMINISTRATE_ORGANIZATION'],
          },
        },
        testContext,
        GRAPHQL_RESOLVE_INFO
      );
    });
    it('should accept a pending user to the organization', async () => {
      const testContext = {
        ...contextAdminSecondOrga,
        user: {
          ...contextAdminSecondOrga.user,
          selected_organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        },
      };
      requestContext.set({
        user: testContext.user,
      });
      const pendingUser = await loginFromProvider({
        email: `testPending${uuidv4()}@second-orga.com`,
        first_name: 'test',
        last_name: 'pending',
        roles: [],
      });

      await usersResolver.Mutation!.editUserCapabilities!(
        {},
        {
          id: pendingUser.id,
          input: {
            capabilities: [
              'MANAGE_PLATFORM_REGISTRATION',
              'ADMINISTRATE_ORGANIZATION',
            ],
          },
        },
        testContext,
        GRAPHQL_RESOLVE_INFO
      );
      const updatedUser = (await UserDomain.loadUserBy({
        email: pendingUser.email,
      }))!;

      expect(updatedUser.selected_org_capabilities).toContain(
        'ADMINISTRATE_ORGANIZATION'
      );
      const usersPendingOrg =
        await UserOrganizationPendingDomain.loadUserOrganizationPending({
          user_id: updatedUser.id,
        });
      expect(usersPendingOrg).toHaveLength(0);

      await UserHelper.removeUser({ email: pendingUser.email });
    });
  });
  describe('editMeUser', () => {
    let simpleUserSecondOrga: UserLoadUserBy;
    let auth0Spy: MockInstance;
    beforeAll(async () => {
      simpleUserSecondOrga = (await UserDomain.loadUserBy({
        email: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.EMAIL,
      }))!;
      requestContext.set(requestContextSimpleUserSecondOrga);

      auth0Spy = vi.spyOn(auth0ClientMock, 'updateUser');
    });

    afterAll(async () => {
      // @ts-expect-error editMeUser is not considered as callable
      await usersResolver.Mutation.editMeUser(
        undefined,
        {
          input: {
            first_name: simpleUserSecondOrga.first_name,
            last_name: simpleUserSecondOrga.last_name,
            country: simpleUserSecondOrga.country,
            picture: simpleUserSecondOrga.picture,
          },
        },
        contextSimpleUserSecondOrga
      );

      auth0Spy.mockReset();
    });

    it('should edit user profile information on auth0 and locally', async () => {
      const newFirstName = 'Roger';
      const newLastName = 'Testeur';
      const newCountry = 'France';
      const newPicture =
        'https://www.labrouettemaraichere.com/cdn/shop/products/29109696c-www.fullstackgardener.com_720x.jpg';

      // @ts-expect-error editMeUser is not considered as callable
      const response = await usersResolver.Mutation.editMeUser(
        undefined,
        {
          input: {
            first_name: newFirstName,
            last_name: newLastName,
            country: newCountry,
            picture: newPicture,
          },
        },
        contextSimpleUserSecondOrga
      );

      // assert response
      expect(response).toMatchObject({
        first_name: newFirstName,
        last_name: newLastName,
        country: newCountry,
        picture: newPicture,
      });

      // assert database
      const [dbUser] = await UserDomain.loadUser({
        email: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.EMAIL,
      });
      expect(dbUser).toMatchObject({
        first_name: newFirstName,
        last_name: newLastName,
        country: newCountry,
        picture: newPicture,
      });

      // assert auth0 call
      expect(auth0Spy).toBeCalledWith({
        email: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.EMAIL,
        first_name: newFirstName,
        last_name: newLastName,
        country: newCountry,
        picture: newPicture,
      });
    });
  });

  describe('resetPassword', () => {
    let auth0Spy: MockInstance;
    beforeAll(() => {
      auth0Spy = vi.spyOn(auth0ClientMock, 'resetPassword');
    });

    afterAll(() => {
      auth0Spy.mockReset();
    });

    it('should call auth0 to reset password', async () => {
      // When
      // @ts-expect-error resetPassword is not considered as callable
      const response = await usersResolver.Mutation.resetPassword(
        undefined,
        {},
        contextSimpleUserFiligran2
      );

      // Then
      expect(response).toBeTruthy();
      expect(response.success).toBeTruthy();
      expect(auth0Spy).toBeCalledWith(
        TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.EMAIL
      );
    });
  });

  describe('acceptPendingUserInOrganization', () => {
    it('should delegate to UserOrganizationApp.acceptPendingUserInOrganization and return mapped user', async () => {
      const acceptedUser = contextSimpleUserSecondOrga.user;
      const acceptPendingUserInOrganizationSpy = vi
        .spyOn(UserOrganizationApp, 'acceptPendingUserInOrganization')
        .mockResolvedValue(acceptedUser);

      const result = await usersResolver.Mutation!
        .acceptPendingUserInOrganization!(
        {},
        {
          user_id: acceptedUser.id,
          organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        },
        contextAdminSecondOrga,
        GRAPHQL_RESOLVE_INFO
      );

      expect(acceptPendingUserInOrganizationSpy).toHaveBeenCalledWith({
        userId: acceptedUser.id,
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      });
      expect(result).toMatchObject({
        id: acceptedUser.id,
        email: acceptedUser.email,
      });

      acceptPendingUserInOrganizationSpy.mockRestore();
    });

    it('should return null when app returns null', async () => {
      const acceptPendingUserInOrganizationSpy = vi
        .spyOn(UserOrganizationApp, 'acceptPendingUserInOrganization')
        .mockResolvedValue(null);

      const result = await usersResolver.Mutation!
        .acceptPendingUserInOrganization!(
        {},
        {
          user_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID,
          organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        },
        contextAdminSecondOrga,
        GRAPHQL_RESOLVE_INFO
      );

      expect(acceptPendingUserInOrganizationSpy).toHaveBeenCalledWith({
        userId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID,
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      });
      expect(result).toBeNull();

      acceptPendingUserInOrganizationSpy.mockRestore();
    });

    it('should map errors when accepting a pending user fails', async () => {
      const acceptPendingUserInOrganizationSpy = vi
        .spyOn(UserOrganizationApp, 'acceptPendingUserInOrganization')
        .mockRejectedValue(new Error('accept pending user failed'));

      const testContext = {
        ...contextAdminSecondOrga,
        user: {
          ...contextAdminSecondOrga.user,
          selected_organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        },
      };

      await expect(
        usersResolver.Mutation!.acceptPendingUserInOrganization!(
          {},
          {
            user_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID,
            organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          },
          testContext,
          GRAPHQL_RESOLVE_INFO
        )
      ).rejects.toBeTruthy();

      acceptPendingUserInOrganizationSpy.mockRestore();
    });
  });

  describe('removePendingUserFromOrganization', () => {
    it('should remove a pending user from organization', async () => {
      // Given
      const testContext = {
        ...contextAdminSecondOrga,
        user: {
          ...contextAdminSecondOrga.user,
          selected_organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        },
      };
      requestContext.set({
        user: testContext.user,
      });
      const email = `testPending${uuidv4()}@second-orga.com`;
      const pendingUser = await loginFromProvider({
        email: email,
        first_name: 'testToRemove',
        last_name: 'pending',
        roles: [],
      });

      const organizationId = TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID;
      // When
      await usersResolver.Mutation!.removePendingUserFromOrganization!(
        {},
        {
          user_id: pendingUser.id,
          organization_id: organizationId,
        },
        testContext,
        GRAPHQL_RESOLVE_INFO
      );

      const usersPendingOrg =
        await UserOrganizationPendingDomain.loadUserOrganizationPending({
          user_id: pendingUser.id,
        });

      // Then
      expect(usersPendingOrg).toHaveLength(0);
      await UserHelper.removeUser({ email: pendingUser.email });
    });

    it('should dispatch event when pending user is removed from organization', async () => {
      const testContext = {
        ...contextAdminSecondOrga,
        user: {
          ...contextAdminSecondOrga.user,
          selected_organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        },
      };
      requestContext.set({
        user: testContext.user,
      });
      const email = `testPending${uuidv4()}@second-orga.com`;
      const pendingUser = await loginFromProvider({
        email: email,
        first_name: 'testToRemove',
        last_name: 'pending',
        roles: [],
      });
      const organizationId = TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID;
      const subscriptionSpy = new SubscriptionSpy();
      await subscriptionSpy.spy(
        usersResolver.Subscription?.UserPending,
        {
          organizationId: toGlobalId('Organization', organizationId),
        },
        contextAdminSecondOrga,
        ['delete']
      );

      await usersResolver.Mutation!.removePendingUserFromOrganization!(
        {},
        {
          user_id: pendingUser.id,
          organization_id: organizationId,
        },
        testContext,
        GRAPHQL_RESOLVE_INFO
      );

      const events = await subscriptionSpy.waitForEvents(1);
      expect(events).toHaveLength(1);
      expect(events[0].UserPending.delete.email).toBe(email);

      await UserHelper.removeUser({ email: pendingUser.email });
      await subscriptionSpy.cleanup();
    });
  });
  describe('bulkRemovePendingUserFromOrganization', () => {
    it('should remove pending users from organization', async () => {
      const email = `testPending${uuidv4()}@second-orga.com`;
      const pendingUser = await loginFromProvider({
        email: email,
        first_name: 'testToRemove',
        last_name: 'pending',
        roles: [],
      });

      const testContext = {
        ...contextAdminSecondOrga,
        user: {
          ...contextAdminSecondOrga.user,
          selected_organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        },
      };
      requestContext.set({
        user: testContext.user,
      });

      await usersResolver.Mutation?.bulkRemovePendingUserFromOrganization!(
        {},
        {
          input: {
            ids: [],
            searchTerm: undefined,
            filters: [],
            excludedIds: [],
          },
        },
        testContext,
        {} as GraphQLResolveInfo
      );

      const usersPendingOrg =
        await UserOrganizationPendingDomain.loadUserOrganizationPending({
          user_id: pendingUser.id,
        });

      expect(usersPendingOrg).toHaveLength(0);
      await UserHelper.removeUser({ email: pendingUser.email });
    });

    it('should dispatch event when pending users are removed from organization', async () => {
      const email = `testPending${uuidv4()}@second-orga.com`;
      const pendingUser = await loginFromProvider({
        email: email,
        first_name: 'testToRemove',
        last_name: 'pending',
        roles: [],
      });

      const testContext = {
        ...contextAdminSecondOrga,
        user: {
          ...contextAdminSecondOrga.user,
          selected_organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        },
      };
      requestContext.set({
        user: testContext.user,
      });

      const organizationId = toGlobalId(
        'Organization',
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
      );
      const subscriptionSpy = new SubscriptionSpy();
      await subscriptionSpy.spy(
        usersResolver.Subscription?.UserPending,
        {
          organizationId: organizationId,
        },
        contextAdminSecondOrga,
        ['invalidate']
      );

      await usersResolver.Mutation?.bulkRemovePendingUserFromOrganization!(
        {},
        {
          input: {
            ids: [],
            searchTerm: undefined,
            filters: [],
            excludedIds: [],
          },
        },
        testContext,
        {} as GraphQLResolveInfo
      );

      const events = await subscriptionSpy.waitForEvents(1);
      expect(events).toHaveLength(1);
      expect(events[0].UserPending.invalidate.id).toBe(
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
      );

      await UserHelper.removeUser({ email: pendingUser.email });
      await subscriptionSpy.cleanup();
    });
  });

  describe('changeSelectedOrganization', () => {
    it('should update portalContext.user and session.user after switching organization', async () => {
      // Given
      const mockSessionSave = vi.fn();
      const mockPortalContext = {
        user: { ...contextSimpleUserSecondOrga.user },
        req: {
          session: {
            user: { ...contextSimpleUserSecondOrga.user },
            save: mockSessionSave,
          },
        },
        res: {},
      } as unknown as PortalContext;
      requestContext.set(requestContextSimpleUserSecondOrga);
      const targetOrgId =
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.PERSONAL_SPACE_ID;

      // When
      // @ts-ignore
      const response = await usersResolver.Mutation.changeSelectedOrganization(
        {},
        { organization_id: targetOrgId },
        mockPortalContext,
        {} as GraphQLResolveInfo
      );

      // Then
      expect(response).toBeTruthy();
      expect(mockPortalContext.user.selected_organization_id).toBe(targetOrgId);
      expect(mockPortalContext.req.session.user.selected_organization_id).toBe(
        targetOrgId
      );
      expect(mockSessionSave).toHaveBeenCalledOnce();
    });
  });
});
