import {
  ApiToken as GraphqlApiToken,
  MutationCreateApiTokenArgs,
  MutationResolvers,
  MutationRevokeApiTokenArgs,
  OrganizationCapability,
  QueryResolvers,
  Resolvers,
} from '../../__generated__/resolvers-types';
import { ApiTokenId } from '../../model/kanel/public/ApiToken';
import { UserLoadUserBy } from '../../model/user';
import { Guarded } from '../../security/guarded/guarded.decorator';
import {
  callerIsGuard,
  sessionCallerGuard,
} from '../../security/guarded/guards/caller.guard';
import { allOf, anyOf } from '../../security/guarded/guards/combinators';
import {
  orgGuard,
  selectedOrganization,
} from '../../security/guarded/guards/organization.guard';
import { loggedInGuard } from '../../security/guarded/guards/portal.guard';
import { fromRecord } from '../../security/guarded/sources';
import { mapToGraphQLError } from '../../utils/error/error.mapping';
import { createRelayIdScalar } from '../../utils/scalar.util';
import { isUuid } from '../../utils/uuid.util';
import { ApiTokenApp } from './api-token.app';
import { getApiTokenAuthentication } from './api-token.auth';
import { ApiTokenDomain, ApiTokenWithNames } from './api-token.domain';

// __typename lets the Node id resolver serve a Relay global id, the form the request context decodes back to the
// row id for a top-level $id variable (revokeApiToken)
const toGraphql = (token: ApiTokenWithNames): GraphqlApiToken => ({
  __typename: 'ApiToken',
  id: token.id,
  name: token.name,
  token_prefix: token.token_prefix,
  scope: token.scope,
  organization_id: token.organization_id,
  organization_name: token.organization_name,
  user_email: token.user_email,
  expires_at: token.expires_at,
  last_used_at: token.last_used_at,
  created_at: token.created_at,
  revoked_at: token.revoked_at,
});

// A malformed id would reach the query as a Postgres error
export const loadApiTokenOfArgs = ({ id }: MutationRevokeApiTokenArgs) =>
  isUuid(id) ? ApiTokenDomain.loadById(id) : Promise.resolve(undefined);

const tokenOfId = fromRecord(loadApiTokenOfArgs);
const organizationOfTokenId = tokenOfId.pick(
  ({ organization_id }) => organization_id
);

const run = async <T>(call: () => Promise<T>): Promise<T> => {
  try {
    return await call();
  } catch (error) {
    throw mapToGraphQLError(error);
  }
};

class ApiTokenQueries {
  @Guarded(loggedInGuard())
  static readonly apiTokens: NonNullable<QueryResolvers['apiTokens']> = (
    _,
    __,
    context
  ) =>
    run(async () =>
      (
        await ApiTokenApp.listOwn(
          context.user as UserLoadUserBy,
          getApiTokenAuthentication(context.req)?.token.organization_id
        )
      ).map(toGraphql)
    );

  @Guarded(
    orgGuard({
      organization: selectedOrganization,
      capabilities: [OrganizationCapability.AdministrateOrganization],
    })
  )
  static readonly organizationApiTokens: NonNullable<
    QueryResolvers['organizationApiTokens']
  > = (_, __, context) =>
    run(async () =>
      (await ApiTokenApp.listOrganization(context.user as UserLoadUserBy)).map(
        toGraphql
      )
    );

  // A session answers null: only a token-authenticated request has a current token
  @Guarded(loggedInGuard())
  static readonly currentApiToken: NonNullable<
    QueryResolvers['currentApiToken']
  > = (_, __, context) =>
    run(async () => {
      const authentication = getApiTokenAuthentication(context.req);
      if (!authentication) {
        return null;
      }
      const token = await ApiTokenDomain.loadById(authentication.token.id);
      if (!token) {
        return null;
      }
      return {
        id: token.id,
        name: token.name,
        scope: token.scope,
        organization_id: token.organization_id,
        organization_name: token.organization_name,
        expires_at: token.expires_at,
        last_used_at: token.last_used_at,
      };
    });
}

class ApiTokenMutations {
  // A token cannot create a token. Membership of the organization is all it takes to make a token for it
  @Guarded(
    allOf(
      sessionCallerGuard(),
      orgGuard<MutationCreateApiTokenArgs>({
        organization: (_, { input }) => input.organization_id,
        capabilities: [],
        bypass: false,
      })
    )
  )
  static readonly createApiToken: NonNullable<
    MutationResolvers['createApiToken']
  > = (_, { input }, context) =>
    run(async () => {
      const { token, api_token } = await ApiTokenApp.create(
        context.user as UserLoadUserBy,
        input
      );
      return { token, api_token: toGraphql(api_token) };
    });

  // The owner revokes a token; so does an administrator of its organization. Both belong to it: a token of another
  // organization than the calling token's is a stranger's, and a BYPASS user who is not a member is one too
  @Guarded(
    allOf(
      orgGuard<MutationRevokeApiTokenArgs>({
        organization: organizationOfTokenId,
        capabilities: [],
        bypass: false,
      }),
      anyOf(
        callerIsGuard<MutationRevokeApiTokenArgs>({
          user: tokenOfId.pick(({ user_id }) => user_id),
        }),
        orgGuard<MutationRevokeApiTokenArgs>({
          organization: organizationOfTokenId,
          capabilities: [OrganizationCapability.AdministrateOrganization],
          bypass: false,
        })
      )
    )
  )
  static readonly revokeApiToken: NonNullable<
    MutationResolvers['revokeApiToken']
  > = (_, { id }, context) =>
    run(async () =>
      toGraphql(await ApiTokenApp.revoke(context.user as UserLoadUserBy, id))
    );
}

const resolvers: Resolvers = {
  ApiTokenId: createRelayIdScalar<ApiTokenId>('ApiToken'),
  Query: { ...ApiTokenQueries },
  Mutation: { ...ApiTokenMutations },
};

export default resolvers;
