# Threat Pulse

Threat Pulse is the opt-in collective intelligence network of the OpenCTI community. Connected OpenCTI platforms contribute keyed hashes and activity counts of the objects they observe, never values, and XTM Hub publishes back community prevalence, network first-seen dates, sector trends and sector benchmarks, only when enough distinct platforms observed the same object.

This page explains what XTM Hub receives, stores and publishes. The OpenCTI side (consent, scopes, exclusions, cards and widgets) is described in the OpenCTI documentation, in the Threat Pulse page of the XTM Hub integration.

## Requirements

- An OpenCTI product **connected to XTM Hub** (see [OpenCTI Product Connection](opencti-connection.md)).
- An OpenCTI version that ships Threat Pulse, with Threat Pulse **enabled by an administrator** of the platform in **Settings > Filigran Experience**. Enabling it requires accepting the consent text, which OpenCTI records with the administrator and the date.

## What a platform sends

Every hour, a contributing OpenCTI platform sends one batch per UTC day with:

| Field | Content |
| --- | --- |
| `hash` | 32 hexadecimal characters derived from the object, encrypted under the salt of the day (see below). Never a value, a name or an identifier. |
| `object_type` | `indicator`, `attack_pattern`, `vulnerability`, `intrusion_set`, `malware` or `tool`. |
| `event_kind` | `created`, `sighted`, `detected`, `hunted` or `referenced`. |
| `count` | How many such events the platform recorded that day. |
| `sector_bucket`, `region_bucket` | Coarse buckets chosen by the administrator (for example `finance`, `europe`), or `undisclosed`. |

The batch schema accepts no other field: XTM Hub rejects any batch that carries anything else.

Objects marked `TLP:RED`, `TLP:AMBER+STRICT` or `PAP:RED`, objects with restricted access and the markings the administrator excludes never leave the platform. The identity of the organization never leaves the platform either: XTM Hub only knows the connected platform.

## How XTM Hub protects the contributions

1. **Daily salt.** XTM Hub draws a new random salt every UTC day (`pulseSalt`). The platform encrypts a stable keyed hash of each object under that salt, so the hashes on the wire change every day and cannot be linked across days by anyone who only sees the traffic. Salts are deleted after 3 days.
2. **Re-keying at rest.** On reception, XTM Hub decrypts each hash with the salt of its day and immediately re-keys it with a secret key held only by XTM Hub (`PULSE_AT_REST_KEY`). The stored key cannot be computed by a platform, so the database alone does not reveal which objects a platform holds.
3. **Pseudonymized platforms.** Platform identifiers are stored as keyed pseudonyms (`PULSE_PLATFORM_KEY`), never in clear.
4. **k-anonymity.** Every published statistic (prevalence, first-seen, trends, trending lists, benchmarks) requires at least `k` distinct contributing platforms, 5 by default. Below the threshold, XTM Hub answers that the object is unpublished and returns no count. A week or a period below `k` weighs 0 in everything derived from it (the weekly series, the trend directions, the trending growth), so no published figure reveals it.
5. **Coarse buckets.** Platform counts are returned as ranges (`5-9`, `10-24`, ... `250+`), never as exact numbers; the 12-week series carries, for each week, the lower bound of its range (5, 10, 25, 50, 100 or 250), and the trending growth and order are computed from those lower bounds, so two objects in the same range always publish the same growth.
6. **Retention.** Contributions older than the retention period (13 months by default) are deleted every night.
7. **Nothing in the logs.** The request logs never keep the text, the variables, the error messages or the stacks of Threat Pulse requests, nor the variables of any request sent without its query text (an automatic persisted query).
8. **Right to purge.** An administrator can purge every contribution of the platform from OpenCTI at any time (`pulsePurge`). XTM Hub deletes them and recomputes the statistics.

## What a platform reads

Reading requires contributing: XTM Hub answers lookups, trending lists and benchmarks only to platforms that contributed during the last 30 days.

| Operation | Purpose |
| --- | --- |
| `pulseStatus` | Day, anonymity threshold, retention, contributors range and read access of the platform. |
| `pulseLookup` | Community prevalence (`rare`, `uncommon`, `common`, `widespread`), contributing platforms range, network first and last seen days, 12-week trend and sector trend of up to 1,000 hashes. |
| `pulseTrending` | Objects rising in a sector and region over 7, 30 or 90 days, returned as hashes the platform matches against its own objects. |
| `pulseBenchmark` | The platform's activity per object type and event kind compared with the median of its sector, and the objects it reports above that median, ordered by their ratio to the median. |

Every operation authenticates with the platform token of the connected product and is rate limited per platform.

## Configuration (self-hosted XTM Hub)

| Environment variable | Default | Description |
| --- | --- | --- |
| `PULSE_ENABLED` | `true` | Turns the Threat Pulse service on or off. |
| `PULSE_AT_REST_KEY` | none | 64 hexadecimal characters. Key used to re-key the hashes at rest. Required. |
| `PULSE_PLATFORM_KEY` | none | 64 hexadecimal characters, different from `PULSE_AT_REST_KEY`. Key used to pseudonymize platforms. Required. |
| `PULSE_K_THRESHOLD` | `5` | Minimum number of distinct platforms before a statistic is published (2 to 1000; values below 5 are not recommended). |
| `PULSE_RETENTION_MONTHS` | `13` | Retention of the contributions, in months. |
| `PULSE_CONTRIBUTION_WINDOW_DAYS` | `30` | A platform can read while its last contribution is more recent than this window. |
| `PULSE_TRENDING_CACHE_TTL_MINUTES` | `60` | Cache duration of the trending lists. |
| `PULSE_RATE_LIMIT_PUSH_PULSE`, `PULSE_RATE_LIMIT_PULSE_LOOKUP`, `PULSE_RATE_LIMIT_PULSE_TRENDING`, `PULSE_RATE_LIMIT_PULSE_BENCHMARK`, `PULSE_RATE_LIMIT_PULSE_SALT`, `PULSE_RATE_LIMIT_PULSE_STATUS` | `120`, `600`, `60`, `30`, `120`, `120` | Calls allowed per platform and per hour. |
| `PULSE_RATE_LIMIT_PULSE_PURGE` | `5` | Purges allowed per platform and per day. |

!!! warning "Keep the keys stable"

    Changing `PULSE_AT_REST_KEY` or `PULSE_PLATFORM_KEY` unlinks every stored statistic from the new contributions. The Helm chart generates both keys once and keeps them on upgrades.

When a key or a setting is missing or invalid, the service stays disabled and logs the reason; the rest of XTM Hub is not affected, and the nightly retention still applies whenever `PULSE_RETENTION_MONTHS` is valid. Trending lists computed under another anonymity threshold are recomputed, never served.
