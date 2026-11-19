import { RequestApiToken, requestContext } from '../context/request.context';

/**
 * A request authenticated by an API token acts on the token's organization only, with the capabilities the token
 * left its user (narrowUserToToken). Every check that reads the caller's membership or capabilities from the database
 * for an organization the caller names goes through these: the database knows every organization of the user, and a
 * token of organization A would reach organization B. A request without a token is not restricted.
 * The rows of the token's user themselves are filtered in the query by src/security/restriction/api-token.ts.
 */
export const ApiTokenReach = {
  allowsOrganization: (organizationId: string): boolean => {
    const apiToken = requestContext.get()?.apiToken;
    return !apiToken || apiToken.organizationId === organizationId;
  },

  // The capabilities a token leaves of these, all of them without a token. For an organization it allows only.
  narrowCapabilities: <Capability extends string>(
    capabilities: readonly Capability[]
  ): Capability[] => {
    const apiToken = requestContext.get()?.apiToken;
    if (!apiToken) {
      return [...capabilities];
    }
    const reachable = new Set<string>(apiToken.organizationCapabilities);
    return capabilities.filter((capability) => reachable.has(capability));
  },

  /**
   * The token of the request, when the rows read are its own user's: a token narrows what its user is shown of
   * themselves (organizations, portal capabilities and roles), not what is read of another user.
   */
  overUser: (userId: string): RequestApiToken | undefined => {
    const apiToken = requestContext.get()?.apiToken;
    return apiToken?.userId === userId ? apiToken : undefined;
  },
};
