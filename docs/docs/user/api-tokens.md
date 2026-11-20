# Personal API tokens

A personal API token lets a script or an integration (for example Filigran Copilot) call the XTM Hub GraphQL API as
you, without your session. A token belongs to you and to one of your organizations, carries one scope, and expires.

## Scopes

| Scope        | What the token may do                                                                                             |
|--------------|-------------------------------------------------------------------------------------------------------------------|
| `read`       | Queries only. Every mutation is refused (`READ_ONLY_API_TOKEN`).                                                  |
| `read_write` | Queries and mutations, without the administration of the organization and without any platform capability.       |
| `admin`      | Your rights in the organization, organization administration included, and your platform capabilities, `BYPASS` excepted. |

A token never exceeds your rights: they are read again on every call. A right removed from you, a disabled account or
a membership that ended takes effect on the next call. No token, whatever its scope, may act on your own account or
obtain a credential that would outlive it (`NOT_ALLOWED_WITH_API_TOKEN`): change the selected organization, log in or
out, add a user to the organization, create another token, refresh your platform token, register a platform, reset
your password, edit your profile or picture, or transfer your personal space. A `read_write` or `admin` token may still
revoke a token.

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
never falls back to a session. A token works on `/graphql-api` only: any other route, the `/graphql-sse` subscription
endpoint included, answers it `403` (`NOT_ALLOWED_WITH_API_TOKEN`). Calls are limited to 300 per minute per token, and
every call is logged with the token and the operation it ran.

`settings { capabilities }` lists `API_TOKENS` when the Hub accepts personal API tokens.

## List and revoke tokens

- `apiTokens` lists your tokens, revoked and expired ones included, with their last use.
- `organizationApiTokens` lists every token of the selected organization, for its administrators.
- `revokeApiToken(id)` revokes a token at once. You revoke your own tokens; an administrator of the organization
  revokes any token of it.
