# Personal API tokens

A personal API token lets a script or an integration (for example Filigran Copilot) call the XTM Hub GraphQL API as
you, without your session. A token belongs to you and to one of your organizations, carries one scope, and expires.

## Scopes

| Scope        | What the token may do                                                                                             |
|--------------|-------------------------------------------------------------------------------------------------------------------|
| `read`       | Queries only, without the administration of the organization. Every mutation is refused (`READ_ONLY_API_TOKEN`). |
| `read_write` | Queries and mutations, without the administration of the organization and without any platform capability.       |
| `admin`      | Your rights in the organization, organization administration included, and your [platform capabilities](#platform-capabilities), `BYPASS` excepted. |

Without the `admin` scope, a token holds none of your rights in the organization: managing its members and their
rights, its subscriptions and its platforms is refused, and so is any query or subscription that needs one of those
rights, such as following the changes of its users in real time. What every member may read, such as the list of the
organization's members, stays readable.

A token never exceeds your rights: they are read again on every call. A right removed from you, a disabled account or
a membership that ended takes effect on the next call. No token, whatever its scope, may act on your own account or
obtain a credential that would outlive it (`NOT_ALLOWED_WITH_API_TOKEN`): change the selected organization, log in or
out, add a user to the organization, create another token, refresh your platform token, register a platform, reset
your password, edit your profile or picture, or transfer your personal space. Adding users to bundle groups by email
reaches the existing members of the organization only. A `read_write` or `admin` token may still revoke a token.

## Platform capabilities

Platform capabilities administer the Hub itself: trials, the service catalogue, deployments, manifests and the SaaS
metrics, for example. They are for Filigran staff. They do not come from the Hub but from Filigran's identity provider
(Auth0): at every sign-in, the Hub replaces them with the ones matching the roles and groups the identity provider
sends. Only an account in the Filigran group of the identity provider receives any. A Filigran email address outside
that group is refused sign-in and loses the platform capabilities it held.

Organization capabilities, such as `ADMINISTRATE_ORGANIZATION`, are a different thing: an administrator of the
organization grants them in the Hub, see [Manage your organization](manage-organization.md).

Only an `admin` token carries platform capabilities: the ones your account holds when the token is used, never
`BYPASS` nor the platform administrator role. A `read` or `read_write` token carries none.

## Create a token

Run the `createApiToken` mutation from your session. The token is shown once, in the answer: copy it then, only its
hash is kept.

```graphql
mutation {
  createApiToken(
    input: {
      name: "Filigran Copilot"
      scope: read_write
      organization_id: "<your organization id>"
      expires_at: "2027-06-30T00:00:00Z"
    }
  ) {
    token
    api_token { id token_prefix scope expires_at }
  }
}
```

A token lives one year at most. It starts with `xhp_`, so secret scanning can recognise it if it leaks.

## Use a token

Send it in the `Authorization` header of every request to the GraphQL API:

```sh
curl https://hub.filigran.io/graphql-api \
  -H "Authorization: Bearer xhp_..." \
  -H "Content-Type: application/json" \
  -d '{"query": "{ currentApiToken { name scope organization_name expires_at last_used_at } }"}'
```

The request runs as you, in the token's organization. A revoked, expired or unknown token is answered `401`: the API
never falls back to a session. After 30 refused tokens in 15 minutes from the same address, the API answers `429` to
every token from that address until the 15 minutes are over. The tokens it accepted in the last hour usually keep
working, but not always: each API server only knows the tokens it accepted itself, and forgets them when it restarts.
Calls are limited to 300 per minute per token, and every call is logged with the token and the operation it
ran. A token works on `/graphql-api` only: the `/graphql-sse` subscription endpoint, the REST endpoints and the
sign-in routes answer it `403` (`NOT_ALLOWED_WITH_API_TOKEN`).

`settings { capabilities }` lists `API_TOKENS` when the Hub accepts personal API tokens.

## List and revoke tokens

- `apiTokens` lists your tokens, revoked and expired ones included, with their last use.
- `organizationApiTokens` lists every token of the selected organization, for its administrators.
- `revokeApiToken(id)` revokes a token at once. You revoke your own tokens; an administrator of the organization
  revokes any token of it.
