import {
  ApiToken as GraphqlApiToken,
  MutationResolvers,
  OrganizationCapability,
  QueryResolvers,
  Resolvers,
} from '../../__generated__/resolvers-types';
import { ApiTokenId } from '../../model/kanel/public/ApiToken';
import { OrganizationId } from '../../model/kanel/public/Organization';
import { UserLoadUserBy } from '../../model/user';
import { Guarded } from '../../security/guarded/guarded.decorator';
import {
  orgGuard,
  selectedOrganization,
} from '../../security/guarded/guards/organization.guard';
import { loggedInGuard } from '../../security/guarded/guards/portal.guard';
import { mapToGraphQLError } from '../../utils/error/error.mapping';
import { createRelayIdScalar } from '../../utils/scalar.util';
import { ApiTokenApp } from './api-token.app';
import { getApiTokenAuthentication } from './api-token.auth';
import { ApiTokenDomain, ApiTokenWithNames } from './api-token.domain';

const toGraphql = (token: ApiTokenWithNames): GraphqlApiToken => ({
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
      (await ApiTokenApp.listOwn(context.user as UserLoadUserBy)).map(toGraphql)
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
  // A token cannot create a token: the operation is refused by apiTokenPlugin before it reaches here
  @Guarded(loggedInGuard())
  static readonly createApiToken: NonNullable<
    MutationResolvers['createApiToken']
  > = (_, { input }, context) =>
    run(async () => {
      const { token, api_token } = await ApiTokenApp.create(
        context.user as UserLoadUserBy,
        { ...input, organization_id: input.organization_id as OrganizationId }
      );
      return { token, api_token: toGraphql(api_token) };
    });

  @Guarded(loggedInGuard())
  static readonly revokeApiToken: NonNullable<
    MutationResolvers['revokeApiToken']
  > = (_, { id }, context) =>
    run(async () =>
      toGraphql(
        await ApiTokenApp.revoke(
          context.user as UserLoadUserBy,
          id as ApiTokenId
        )
      )
    );
}

const resolvers: Resolvers = {
  ApiTokenId: createRelayIdScalar<ApiTokenId>('ApiToken'),
  Query: { ...ApiTokenQueries },
  Mutation: { ...ApiTokenMutations },
};

export default resolvers;
