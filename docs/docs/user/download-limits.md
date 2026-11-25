# Download limits

Downloading a library resource (a custom dashboard, a custom view, an integration, a playbook or a scenario) is
limited. The limits apply to downloads from the Hub and to the downloads a connected OpenCTI or OpenAEV makes for its
users, for example during a one-click deploy.

## Limits

Both limits count over a window of 3 minutes.

| Counted per     | Downloads | Who it is                                                                                                  |
|-----------------|-----------|------------------------------------------------------------------------------------------------------------|
| User            | 10        | You, from your Hub session or from the user token your connected platform sends for you.                   |
| Network address | 100       | Everyone behind one public address. A connected platform downloads from its server for all its users, so this bounds the whole platform. |

A download counts against both limits: a user who has 10 downloads left is still refused once their address has used
its 100.

## When a limit is reached

The Hub answers `429 Too Many Requests` with this body until the window is over:

```json
{ "message": "Too many requests, please try again later" }
```

The `Retry-After` header of that answer gives the seconds to wait. Every download answer also carries the
`RateLimit-Limit`, `RateLimit-Remaining` and `RateLimit-Reset` headers, so a script can slow down before it is refused.

Each Hub server counts on its own, so behind several servers a client may get more downloads before it is refused.
