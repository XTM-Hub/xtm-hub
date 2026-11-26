# Rate limits

The Hub limits how fast a client calls its GraphQL API and downloads library resources. Each Hub server counts on its
own, so behind several servers a client may get more calls before it is refused.

## GraphQL API

The limits apply to `/graphql-api` and to the `/graphql-sse` subscription endpoint, which share the same budgets.

| Caller           | Calls per minute | Counted per                                                                              |
|------------------|------------------|------------------------------------------------------------------------------------------|
| Signed-in user   | 600              | User: the browser and every tab of your session, and your personal API tokens, together. |
| Anonymous caller | 300              | Public network address: public pages and connected platforms calling without a session.  |
| Personal API token | 300            | Token, on top of the user limit. See [Personal API tokens](api-tokens.md#use-a-token).   |

Beyond a limit, the API answers `429 Too Many Requests` until the minute is over, with this body:

```json
{ "errors": [{ "message": "TOO_MANY_REQUESTS", "extensions": { "code": "TOO_MANY_REQUESTS" } }] }
```

The `Retry-After` header of that answer gives the seconds to wait. Every answer also carries the `RateLimit-Limit`,
`RateLimit-Remaining` and `RateLimit-Reset` headers for the user or anonymous limit, and, for a call with a personal API
token, the `RateLimit` and `RateLimit-Policy` headers for the token limit, so a script can slow down before it is
refused.

### Size of an operation

The API refuses an operation, before running it, when it goes deeper than 10 levels of fields or uses more than 10
aliases. Fragments count as if their fields were written in place; `__typename` and introspection fields do not count.
The answer lists the error, for example `Query depth 12 exceeds the limit of 10`.

### Operations with their own limit

- **Contacting sales**: 5 messages per hour, per user or per platform. Beyond, the operation fails with
  `TOO_MANY_REQUESTS`.
- **Sharing a resource**: the share counter of a resource counts one share per network address per hour. Later shares
  from the same address succeed without being counted.

## Downloads

Downloading a library resource (a custom dashboard, a custom view, an integration, a playbook or a scenario) is
limited. The limits apply to downloads from the Hub and to the downloads a connected OpenCTI or OpenAEV makes for its
users, for example during a one-click deploy. Both count over a window of 3 minutes.

| Counted per     | Downloads | Who it is                                                                                                  |
|-----------------|-----------|------------------------------------------------------------------------------------------------------------|
| User            | 10        | You, from your Hub session or from the user token your connected platform sends for you.                   |
| Network address | 100       | Everyone behind one public address. A connected platform downloads from its server for all its users, so this bounds the whole platform. |

A download counts against both limits: a user who has 10 downloads left is still refused once their address has used
its 100.

Beyond a limit, the Hub answers `429 Too Many Requests` until the window is over, with the same headers as the
GraphQL API and this body:

```json
{ "message": "Too many requests, please try again later" }
```
