import { ApolloServer } from '@apollo/server';
import { toGlobalId } from 'graphql-relay/node/node.js';
import { v4 as uuidv4 } from 'uuid';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  CAPABILITY_READ_SAAS_METRICS,
  contextSimpleUserSecondOrga,
  TEST_ORGANIZATIONS,
} from '../../../../tests/tests.const';
import { PortalContext } from '../../../model/portal-context';
import { CAPABILITY_BYPASS } from '../../../portal.const';
import { Context } from '../../../server/apollo-plugins/log';
import { createApolloServer } from '../../../server/apollo-server';
import createSchema from '../../../server/graphql-schema';
import { UserDomain } from '../user/user-domain/user.domain';
import { OrganizationApp } from './organization.app';
import { OrganizationDataLoader } from './organization.dataloader';
import { OrganizationDomain } from './organization.domain';

const ORGANIZATIONS_QUERY = `query ($searchTerm: String) {
  organizations(orderBy: name, orderMode: asc, searchTerm: $searchTerm) {
    totalCount
    edges { node { id name } }
  }
}`;

const ORGANIZATION_QUERY = `query ($id: ID!) {
  organization(id: $id) { id name }
}`;

const USER_ORGANIZATIONS_ADMINISTRATOR_EMAILS_QUERY = `query {
  userOrganizations { id administrator_emails }
}`;

const NOT_AUTHORIZED = /^Not authorized/;

// The Node id resolver exposes the Relay global id
const SECOND_ORGANIZATION_GLOBAL_ID = toGlobalId(
  'Organization',
  TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
);

// Each request gets its own dataloaders, as the server builds them per request
const withOrganizationDataLoader = (context: PortalContext): PortalContext =>
  ({
    ...context,
    dataLoaders: { organization: OrganizationDataLoader.create() },
  }) as PortalContext;

const withPortalCapability = (
  capability: typeof CAPABILITY_READ_SAAS_METRICS
): PortalContext =>
  ({
    ...contextSimpleUserSecondOrga,
    user: {
      ...contextSimpleUserSecondOrga.user,
      capabilities: [capability],
    },
  }) as PortalContext;

describe('organization GraphQL schema', () => {
  const server: ApolloServer<Context> = createApolloServer({
    schema: createSchema(),
    exposeSchemaDetails: false,
  });

  beforeAll(async () => {
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  const execute = async (
    query: string,
    contextValue: PortalContext,
    variables: Record<string, unknown> = {}
  ) => {
    const response = await server.executeOperation(
      { query, variables },
      { contextValue }
    );
    if (response.body.kind !== 'single') {
      throw new Error('Expected a single GraphQL response');
    }
    return response.body.singleResult;
  };

  describe('organizations query', () => {
    it('should let a BYPASS user list the organizations', async () => {
      // Given / When
      const { data, errors } = await execute(
        ORGANIZATIONS_QUERY,
        withPortalCapability(CAPABILITY_BYPASS),
        { searchTerm: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.NAME }
      );

      // Then
      expect(errors).toBeUndefined();
      expect(data?.organizations).toMatchObject({
        edges: expect.arrayContaining([
          {
            node: {
              id: SECOND_ORGANIZATION_GLOBAL_ID,
              name: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.NAME,
            },
          },
        ]),
      });
    });

    it('should forbid a user without any capability to list the organizations', async () => {
      // Given
      const loadOrganizations = vi.spyOn(
        OrganizationDomain,
        'loadOrganizations'
      );

      // When
      const { data, errors } = await execute(
        ORGANIZATIONS_QUERY,
        contextSimpleUserSecondOrga
      );

      // Then
      expect(errors?.[0]?.message).toMatch(NOT_AUTHORIZED);
      expect(data).toBeNull();
      expect(loadOrganizations).not.toHaveBeenCalled();
    });
  });

  describe('organization query', () => {
    it('should let a BYPASS user read an organization', async () => {
      // Given / When
      const { data, errors } = await execute(
        ORGANIZATION_QUERY,
        withPortalCapability(CAPABILITY_BYPASS),
        { id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID }
      );

      // Then
      expect(errors).toBeUndefined();
      expect(data).toEqual({
        organization: {
          id: SECOND_ORGANIZATION_GLOBAL_ID,
          name: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.NAME,
        },
      });
    });

    it('should forbid a user without any capability to read an organization', async () => {
      // Given
      const loadOrganizationBy = vi.spyOn(
        OrganizationDomain,
        'loadOrganizationBy'
      );

      // When
      const { data, errors } = await execute(
        ORGANIZATION_QUERY,
        contextSimpleUserSecondOrga,
        { id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID }
      );

      // Then
      expect(errors?.[0]?.message).toMatch(NOT_AUTHORIZED);
      expect(data).toEqual({ organization: null });
      expect(loadOrganizationBy).not.toHaveBeenCalled();
    });
  });

  // Each mutation carries its own @auth, so each one is checked: removing one
  // of them would leave the two others green
  describe('organization mutations', () => {
    const organizationInput = { name: 'Never created', domains: [] };

    it.each`
      mutation                | appMethod               | query
      ${'addOrganization'}    | ${'createOrganization'} | ${`mutation ($input: OrganizationInput!) { addOrganization(input: $input) { id } }`}
      ${'editOrganization'}   | ${'updateOrganization'} | ${`mutation ($id: ID!, $input: OrganizationInput!) { editOrganization(id: $id, input: $input) { id } }`}
      ${'deleteOrganization'} | ${'deleteOrganization'} | ${`mutation ($id: ID!) { deleteOrganization(id: $id) { id } }`}
    `(
      'should forbid a user without any capability to call $mutation',
      async ({
        mutation,
        appMethod,
        query,
      }: {
        mutation: string;
        appMethod:
          'createOrganization' | 'updateOrganization' | 'deleteOrganization';
        query: string;
      }) => {
        // Given the app layer is stubbed, so a broken guard cannot write to the shared database
        const guarded = vi
          .spyOn(OrganizationApp, appMethod)
          .mockResolvedValue(undefined as never);

        // When
        const { data, errors } = await execute(
          query,
          contextSimpleUserSecondOrga,
          { id: uuidv4(), input: organizationInput }
        );

        // Then
        expect(errors?.[0]?.message).toMatch(NOT_AUTHORIZED);
        expect(data).toEqual({ [mutation]: null });
        expect(guarded).not.toHaveBeenCalled();
      }
    );
  });

  describe('administrator_emails field of Organization', () => {
    it('should hide the administrator emails from a user without any capability', async () => {
      // Given
      const loadAdministratorEmails = vi.spyOn(
        UserDomain,
        'loadUserEmailsByCapabilityInOrganizations'
      );

      // When
      const { data, errors } = await execute(
        USER_ORGANIZATIONS_ADMINISTRATOR_EMAILS_QUERY,
        withOrganizationDataLoader(contextSimpleUserSecondOrga)
      );

      // Then the organizations are listed, each without its administrator emails
      const organizations = (
        data as {
          userOrganizations: { id: string; administrator_emails: unknown }[];
        }
      ).userOrganizations;
      expect(organizations).toContainEqual({
        id: SECOND_ORGANIZATION_GLOBAL_ID,
        administrator_emails: null,
      });
      expect(
        organizations.every(
          ({ administrator_emails }) => administrator_emails === null
        )
      ).toBe(true);
      expect(errors).toHaveLength(organizations.length);
      errors?.forEach(({ message }) => expect(message).toMatch(NOT_AUTHORIZED));
      expect(loadAdministratorEmails).not.toHaveBeenCalled();
    });

    it('should show the administrator emails to a READ_SAAS_METRICS user', async () => {
      // Given / When
      const { data, errors } = await execute(
        USER_ORGANIZATIONS_ADMINISTRATOR_EMAILS_QUERY,
        withOrganizationDataLoader(
          withPortalCapability(CAPABILITY_READ_SAAS_METRICS)
        )
      );

      // Then
      expect(errors).toBeUndefined();
      expect(data?.userOrganizations).toContainEqual({
        id: SECOND_ORGANIZATION_GLOBAL_ID,
        administrator_emails: expect.arrayContaining([
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.EMAIL,
        ]),
      });
    });
  });
});
