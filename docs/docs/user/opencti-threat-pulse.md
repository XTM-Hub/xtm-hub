# Threat Pulse

Threat Pulse is the collective intelligence network of the OpenCTI community. Contributing OpenCTI platforms send keyed hashes and activity counts of the objects they observe, never values, and XTM Hub publishes back community prevalence, network first-seen dates, sector trends and sector benchmarks, only when enough distinct platforms observed the same object. Every connected platform, contributing or not, can download a coarse **preview** of the most prevalent objects without sending anything about its own data; contributing unlocks the full experience.

This page explains what XTM Hub receives, stores and publishes. The OpenCTI side (consent, scopes, exclusions, cards and widgets) is described in the OpenCTI documentation, in the Threat Pulse page of the XTM Hub integration.

## Requirements

- An OpenCTI product **connected to XTM Hub** (see [OpenCTI Product Connection](opencti-connection.md)).
- An OpenCTI version that ships Threat Pulse. The preview runs by default on every connected platform and sends nothing; contributing (and the full experience) requires an administrator to **enable the contribution** in **Settings > Filigran Experience** and accept the consent text, which OpenCTI records with the administrator and the date.

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

1. **Daily salt.** XTM Hub draws a new random salt every UTC day (`pulseSalt`) and serves it to connected platforms only. The platform encrypts a stable keyed hash of each object under that salt, so the hashes it sends change every day: hashes recorded on different days (a proxy log, a copy of request bodies) cannot be linked to each other or to an object without the salts of those days. A salt is kept for its own UTC day and the two following days, then deleted. The salt is not a secret among connected platforms, and the stable keyed hash uses a key every OpenCTI platform shares (that is what lets the network match an object): a connected platform that knows a value can compute its hash for a day, as the preview does. Request bodies are therefore protected in transit by TLS, and what XTM Hub publishes is protected by k-anonymity (below), not by the salt.
2. **Re-keying at rest.** On reception, XTM Hub decrypts each hash with the salt of its day and immediately re-keys it with a secret key held only by XTM Hub (`PULSE_AT_REST_KEY`). The stored key cannot be computed by a platform, so the database alone does not reveal which objects a platform holds.
3. **Pseudonymized platforms.** Platform identifiers are stored as keyed pseudonyms (`PULSE_PLATFORM_KEY`), never in clear.
4. **k-anonymity.** Every published statistic (prevalence, first-seen, trends, trending lists, benchmarks, the preview digest) requires at least `k` distinct contributing platforms, 5 by default. Below the threshold, XTM Hub answers that the object is unpublished and returns no count. A week or a period below `k` weighs 0 in everything derived from it (the weekly series, the trend directions, the trending growth), so no published figure reveals it, and the first and last seen days only come from weeks that `k` distinct platforms reached.
5. **Coarse buckets.** Platform counts are returned as ranges (`5-9`, `10-24`, ... `250+`), never as exact numbers; the 12-week series carries, for each week, the lower bound of its range (5, 10, 25, 50, 100 or 250), and the trending growth and order are computed from those lower bounds, so two objects in the same range always publish the same growth.
6. **Retention.** Contributions older than the retention period (13 months by default) are deleted every night.
7. **Nothing in the logs.** The request logs never keep the text, the variables, the operation name, the error paths, the error messages or the stacks of Threat Pulse requests, nor the variables of any request sent without its query text (an automatic persisted query); an unexpected failure is logged with its error class and code only.
8. **Right to purge.** An administrator can purge every contribution of the platform from OpenCTI at any time (`pulsePurge`). XTM Hub deletes them and recomputes the statistics.

## What a platform reads

### The preview (every connected platform)

`pulseSalt` and `pulseDigest` answer every connected platform, contributing or not. The digest is a download: the request carries the day and the coarse sector and region buckets of the platform, nothing about its objects. It holds:

- the `PULSE_DIGEST_SIZE` objects (5,000 by default) that the most distinct platforms reported over the last 30 days, `k` platforms at least, each as a hash under the salt of the day with its community prevalence and its trend only;
- the trending list of the sector (and region) over the last 7 days: the first 3 ranks as hashes with their prevalence and trend, the next ones (up to rank 10) as a count only.

OpenCTI computes the hashes of its own objects locally, matches them against the digest and shows the result as the Threat Pulse preview. Nothing is sent back.

### The full experience (contributing platforms)

Reciprocity is enforced by XTM Hub: lookups, trending lists and benchmarks answer `PULSE_CONTRIBUTION_REQUIRED` to a platform that never contributed or whose last contribution is older than the grace period. A platform is an **active contributor** while its last contribution is at most `PULSE_CONTRIBUTION_WINDOW_DAYS` (7) days old and keeps the full experience for `PULSE_CONTRIBUTION_GRACE_DAYS` (14) days after its last contribution; past that, OpenCTI falls back to the preview until the next contribution. `pulseStatus` reports the contribution status (`active`, `grace`, `lapsed` or `none`) and the last day of read access.

| Operation | Purpose |
| --- | --- |
| `pulseStatus` | Day, anonymity threshold, retention, contributors range, contribution status and read access of the platform. |
| `pulseDigest` | The preview described above. Open to every connected platform. |
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
| `PULSE_RETENTION_MONTHS` | `13` | Retention of the contributions, in months, from 9 to 120: the 90-day trends compare the last 270 days. Below 9, the service stays disabled and the nightly retention still deletes contributions older than the configured period. |
| `PULSE_CONTRIBUTION_WINDOW_DAYS` | `7` | A platform is an active contributor while its last contribution is at most this old. |
| `PULSE_CONTRIBUTION_GRACE_DAYS` | `14` | A platform keeps lookups, trending lists and benchmarks for this many days after its last contribution (at least `PULSE_CONTRIBUTION_WINDOW_DAYS`). |
| `PULSE_DIGEST_SIZE` | `5000` | Objects in the preview digest (100 to 20,000). |
| `PULSE_TRENDING_CACHE_TTL_MINUTES` | `60` | Cache duration of the trending lists and of the preview digest. |
| `PULSE_RATE_LIMIT_PUSH_PULSE`, `PULSE_RATE_LIMIT_PULSE_LOOKUP`, `PULSE_RATE_LIMIT_PULSE_TRENDING`, `PULSE_RATE_LIMIT_PULSE_BENCHMARK`, `PULSE_RATE_LIMIT_PULSE_SALT`, `PULSE_RATE_LIMIT_PULSE_STATUS`, `PULSE_RATE_LIMIT_PULSE_DIGEST` | `120`, `600`, `60`, `30`, `120`, `120`, `24` | Calls allowed per platform and per hour. |
| `PULSE_RATE_LIMIT_PULSE_PURGE` | `5` | Purges allowed per platform and per day. |

!!! warning "Keep the keys stable"

    Changing `PULSE_AT_REST_KEY` or `PULSE_PLATFORM_KEY` unlinks every stored statistic from the new contributions. The Helm chart generates both keys once and keeps them on upgrades.

When a key or a setting is missing or invalid, the service stays disabled and logs the reason; the rest of XTM Hub is not affected, and the nightly retention still applies whenever `PULSE_RETENTION_MONTHS` is valid. Trending lists and digests computed under another anonymity threshold, digest size or publication rule are recomputed, never served; a purge or the nightly retention discards them at once.
