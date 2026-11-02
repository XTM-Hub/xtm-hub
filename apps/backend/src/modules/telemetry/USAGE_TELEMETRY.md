# XTM Hub Usage Telemetry

The hub has two complementary telemetry pipelines:

1. **Events** (existing) — user/business events (`login`, `register`, `unregister`, `create_deployment`, `download`, ...) indexed into the hub's Elasticsearch (`telemetry` alias) via the pg-boss queue, replicated to the Filigran data warehouse. Events answer _"what happened"_ (funnels, activity). Every event is stamped by `TelemetryApp.sendTelemetryEvent` with `hub_instance_id` (the same durable PlatformMetadata identity the gauges export as `service.instance.id`) and `hub_environment` (`production` / `staging` / ...), so the warehouse can attribute events to the production hub vs staging/dev deployments. Note the pre-existing `platform_id` event field identifies the _registered OpenCTI/OpenAEV platform_, not the hub instance.
2. **Gauges** (this document) — periodic snapshots of aggregate counts exported over OTLP/HTTP to the dedicated Filigran collector, exactly like OpenCTI / OpenAEV / XTM One / OpenGRC. Gauges answer _"what is the current state"_, which the event stream fundamentally cannot (e.g. a platform that unregisters and re-registers inflates event counts forever, while the registered-platforms gauge always reports the truth from the database).

## Transport

- Gauge telemetry only runs when the configured environment is `production` or `staging`. Feature environments, dev, prerelease, CI and developer machines never export (the hub deploys long-lived environments with `NODE_ENV=development`, so a dev-mode export path would flood the staging collector - one upload per 2 minutes per environment - and mint a throwaway instance identity for every CI run).
- OTLP/HTTP to `https://telemetry.hub.filigran.io/v1/metrics` (production) or `https://telemetry.hub.staging.filigran.io/v1/metrics` (staging).
- Fixed cadence for every environment: database counts are refreshed hourly, export happens every 6 hours.
- `TELEMETRY_GAUGE_DEBUG=true` is the explicit opt-in for end-to-end pipeline testing: it enables gauge telemetry in any environment with a tight cadence (1 min refresh / 2 min export) towards the staging collector (production endpoint only in the production environment).
- At startup the collector is probed once (POST `{}`, expect 200); when unreachable, gauge telemetry silently self-disables for the lifetime of the process.
- Implemented in `telemetry-snapshot.app.ts` / `telemetry-snapshot.domain.ts` / `telemetry-snapshot.helper.ts`; started from `index.ts`, stopped via a shutdown hook.

## Resource attributes

| Attribute                   | Description                                                                                                                                              |
| :-------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `service.name`              | Always `xtm-hub-telemetry`.                                                                                                                              |
| `service.version`           | `APP_VERSION` env var, falling back to the package version.                                                                                              |
| `service.instance.id`       | Durable instance UUID seeded by the `add_platform_metadata` migration (`PlatformMetadata` table).                                                        |
| `service.instance.creation` | First-migration timestamp of the instance.                                                                                                               |
| `filigran.telemetry.tags`   | Optional deployment tags from the `TELEMETRY_TAGS` env var (comma-separated, normalized: trimmed, lowercased, deduplicated, sorted). Omitted when unset. |

## Gauges

All gauges are aggregate counts. Dimensions (OTLP attributes) are low-cardinality only — never per-organization or per-user breakdowns.

| Gauge                                      | Dimensions                                                                                    | Description                                                                                                 |
| :----------------------------------------- | :-------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------- |
| `xtm_hub_total_users_count`                | —                                                                                             | Total number of users.                                                                                      |
| `xtm_hub_active_users_count`               | —                                                                                             | Users with a login in the last 30 days.                                                                     |
| `xtm_hub_disabled_users_count`             | —                                                                                             | Disabled users.                                                                                             |
| `xtm_hub_pending_users_count`              | —                                                                                             | Pending organization memberships.                                                                           |
| `xtm_hub_organizations_count`              | —                                                                                             | Total number of organizations.                                                                              |
| `xtm_hub_organizations_by_type`            | `org_type` (personal / professional)                                                          | Organizations by type.                                                                                      |
| `xtm_hub_registered_platforms_by_identity` | `product` (open-cti / open-aev), `contract` (CE / EE / trial), `status` (active / inactive)   | Registered platforms — the current-state registration gauge.                                                |
| `xtm_hub_trials_by_status`                 | `status` (active / pending / provisioning / queued / cancelled / expired / failed), `product` | Trial deployment requests. Ongoing = non-terminal statuses; rows persist, so the sum is the all-time total. |
| `xtm_hub_active_subscriptions_by_service`  | `service` (service definition identifier)                                                     | Active (started, not ended) subscriptions.                                                                  |
| `xtm_hub_service_instances_count`          | —                                                                                             | Total number of service instances.                                                                          |
| `xtm_hub_shared_resources_by_type`         | `type` (document type)                                                                        | Active, non-decommissioned library documents.                                                               |

## Events

### `news_feed_redirect`

A click on a news feed link, i.e. a user following a link given to OpenCTI by the news feed. One event per click, emitted by two routes:

- **External redirect** (`GET /redirect/news-feed/:itemId`, public): emitted each time the endpoint answers a 302 to a destination built from the item (blog post on `filigran.io`, ...). Nothing is emitted for the fallback to the hub root nor for a 429.
- **Resource redirect** (`/redirect/<serviceDefinitionIdentifier>`, the existing login-gated route, link carrying `utm_medium=newsfeed`): emitted by the frontend through the `sendTelemetryEvent { newsFeedRedirect(input) }` GraphQL mutation, only when the user is sent to the resource page.

Both are fire and forget: a telemetry failure never changes the redirect. The IP and the user agent are never stored. `hub_instance_id` and `hub_environment` are stamped as for every event.

| Field                 | External redirect                                                               | Resource redirect                                                  |
| :-------------------- | :------------------------------------------------------------------------------ | :----------------------------------------------------------------- |
| `news_feed_item_id`   | The item clicked.                                                               | Not set (the link carries no item id).                             |
| `news_feed_item_type` | Item type in lowercase, e.g. `blog-post`.                                       | Not set.                                                           |
| `destination_host`    | `filigran.io` (or `github.com` for releases, later).                            | Not set.                                                           |
| `platform_id`         | The platform UUID of the query, when valid. Never forwarded to the destination. | The platform UUID of the query, when valid.                        |
| `service`             | Not set.                                                                        | The service (`TelemetryEventService`).                             |
| `resource_id`         | Not set.                                                                        | The document the link targets.                                     |
| `target_product`      | Not set.                                                                        | The product of the link (`utm_source`).                            |
| `utm_content`         | Not set.                                                                        | Kind of resource (`custom_dashboard`, `playbook`, ... or `other`). |

Who the event identifies: when a user is logged in (the external route reads the existing session read-only, it never creates or modifies one), the event carries `user_id` and the organization (`organization_id`, `organization_name`, `organization_type`) of the selected organization. Otherwise it is anonymous: no `user_id`, no organization, and `organization_type` is `Public`. `platform_id` comes from the query string, so it is validated (UUID) and is best-effort analytics only.

## Configuration

| Env var                 | Default | Description                                                                                                                               |
| :---------------------- | :------ | :---------------------------------------------------------------------------------------------------------------------------------------- |
| `TELEMETRY_TAGS`        | (empty) | Comma-separated deployment tags (e.g. `saas,eu-west`) attached to every gauge export as the `filigran.telemetry.tags` resource attribute. |
| `TELEMETRY_GAUGE_DEBUG` | (unset) | Set to `true` to force-enable gauge telemetry with the tight debug cadence (1 min refresh / 2 min export) for pipeline testing.           |
