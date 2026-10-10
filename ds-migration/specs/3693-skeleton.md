---
key: 3693-skeleton
issue: 3693
epic: epic-3-candidates
kind: candidate # ds | candidate | adoption | cleanup
legacy_symbols: [Skeleton]
target_module: "@/components/ui/skeleton"
target_symbols: [Skeleton]
legacy_files_to_delete: [apps/frontend/src/components/filigran-ui/components/servers/Skeleton.tsx]
---

# Skeleton → `@/components/ui/skeleton`, rebuilt on design system tokens

## Intent

The design system ships no `Skeleton`: its only loading primitives are `Spinner` (indeterminate, control-sized) and
`ProgressBar` (determinate). The legacy `Skeleton`, an empty pulsing `div` (12 call sites in 12 files, plus the legacy
`DataTable` loading rows), is rebuilt as a candidate in `src/components/ui/skeleton/` on design system tokens: the
neutral fill and the 4px radius of the `ProgressBar` empty track, and the `motion-safe:` animation the design system
uses for `Spinner`. Every placeholder keeps its size, its shape and the moment it shows.

## The component

`src/components/ui/skeleton/`, the package layout:

- `Skeleton.tsx`: `Skeleton`, an empty `div`. Classes, merged with the app's `cn` (`@/lib/utils`), `className` last:
  `motion-safe:animate-pulse rounded-sm bg-feedback-neutral-secondary`. Props: the native `div` attributes and
  `className`; no variant, no size (callers size it). It forwards its ref to the `div` and sets
  `displayName = 'Skeleton'`, as `Separator` does. No role and no ARIA attribute: the legacy rendered none, and an
  empty `div` has no accessible name.
- `Skeleton.meta.ts`: `SkeletonMeta`, typed `ComponentMeta` from `@filigran/design-system/meta` (type import only):
  name, description, `status: 'beta'`, `category: 'feedback'`, `version: '0.1.0'`, `radixPrimitive: 'none'`, variant
  `default`, no size, two examples (`<Skeleton className="h-24 w-full" />`,
  `<Skeleton className="size-4 rounded-full" />`), `props`, and `accessibility` with `wcagStatus: 'pending'`, no
  contrast pair, and notes: empty and unnamed, so it stays out of the accessibility tree; the loading region owns
  `aria-busy` (the `Spinner` contract's RULE-02); the pulse stops under `prefers-reduced-motion: reduce`.
- `Skeleton.test.tsx`: renders an empty `div` with no role; the fill, radius and `motion-safe:animate-pulse`
  classes; a caller's `rounded-full` replaces `rounded-sm`; `className` merges (`h-24 w-full`); native attributes
  pass through (`data-testid`); the ref reaches the `div`.
- `index.ts`: exports `Skeleton` and the `SkeletonProps` type, never the meta.

## Props mapping

Every call site imports `Skeleton` from `@/components/ui/skeleton` and drops it from its `@filigran/ui` import line
(the whole line when it was the only name). The classes callers pass stay as they are.

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| `<Skeleton className="w-full inset-1/2" />` | same | 8 (`FeatureVotingList`, the `page-loader.tsx` of `opencti_integrations`, `openaev_scenarios`, `opencti_playbooks`, `opencti_custom_views`, `opencti_custom_dashboards`, and `public-epic-list-page-loader`, `public-document-list-page-loader`) |
| `<Skeleton className="h-24 w-full" />` | same | 1 (`ContentEditDialog`) |
| `<Skeleton className="h-40 w-full" />` | same | 1 (`VotingRoundResults`) |
| `<Skeleton className="h-64 w-full" />` | same | 1 (`VotingRoundDetail`) |
| `<Skeleton className="size-4 rounded-full" />` | same | 1 (`XtmoneConnectionStatus`) |
| `<Skeleton className="h-l w-full" />`, imported from `'../servers'` | same, imported from `@/components/ui/skeleton` | 1 (legacy `DataTable` `LoadingRow`) |

## Files in scope

- `apps/frontend/src/components/ui/skeleton/Skeleton.tsx`, `Skeleton.meta.ts`, `Skeleton.test.tsx`, `index.ts` (new)
- `apps/frontend/src/components/feature-voting/FeatureVotingList.tsx`
- `apps/frontend/src/components/content-translation/ContentEditDialog.tsx`
- `apps/frontend/src/components/admin/voting-round/VotingRoundResults.tsx`
- `apps/frontend/src/components/admin/voting-round/VotingRoundDetail.tsx` (`DataTable` stays on `@filigran/ui`)
- `apps/frontend/src/components/service/trial-instances/xtm-platform-trial/active-bundle/XtmoneConnectionStatus.tsx`
- `apps/frontend/app/(application)/app/(user)/service/opencti_integrations/[serviceInstanceId]/page-loader.tsx`
- `apps/frontend/app/(application)/app/(user)/service/openaev_scenarios/[serviceInstanceId]/page-loader.tsx`
- `apps/frontend/app/(application)/app/(user)/service/opencti_playbooks/[serviceInstanceId]/page-loader.tsx`
- `apps/frontend/app/(application)/app/(user)/service/opencti_custom_views/[serviceInstanceId]/page-loader.tsx`
- `apps/frontend/app/(application)/app/(user)/service/opencti_custom_dashboards/[serviceInstanceId]/page-loader.tsx`
- `apps/frontend/app/(public)/[locale]/cybersecurity-solutions/xtm-platform-roadmap/public-epic-list-page-loader.tsx`
- `apps/frontend/app/(public)/[locale]/cybersecurity-solutions/[slug]/public-document-list-page-loader.tsx`
- `apps/frontend/src/components/filigran-ui/components/clients/DataTable.tsx` (the `Skeleton` import only)
- `apps/frontend/src/components/filigran-ui/components/servers/index.ts` (drop `export * from './Skeleton'`)
- `apps/frontend/src/components/filigran-ui/components/servers/Skeleton.tsx` (delete)

`TrialUserFormSkeleton` is a form of its own that never renders `Skeleton`: untouched. No unit test and no e2e
locator finds a skeleton (no `animate-pulse`, `Skeleton` or `aria-busy` query in `apps/frontend` tests or
`apps/e2e/tests/`).

## Screens

The skeleton itself is not captured: it only shows while a query is in flight, and no screen can hold it (see
Decisions). The one screen is the loaded voting round detail, where two of the skeletons stand, so the comparison
only checks the page around them; `Skeleton.test.tsx` covers the component's rendering. Do not add a step that waits
for the pulse.

```json
[
  {
    "name": "voting-round-detail",
    "path": "/app/admin/voting-rounds",
    "steps": [{ "click": "role=button[name=\"Reject all\"]" }, { "click": "tbody tr" }, { "waitFor": "role=heading[name=\"Results\"]" }]
  }
]
```

## Out of scope

- `TrialUserFormSkeleton` and every other hand-rolled loading state.
- The legacy `DataTable` beyond its import line (3705), and `GradientButton`, the other export of `servers/` (3697).
- `aria-busy` on the regions that load, and the zero-height `w-full inset-1/2` placeholders (Deferred findings).

## Accessibility and i18n

- The element stays an empty, unnamed `div` with no role: absent from the accessibility tree, as before. No call site
  sets `aria-busy` today; none gains it here.
- The pulse becomes `motion-safe:`: it stops under `prefers-reduced-motion: reduce` (WCAG 2.3.3), the static fill
  stays.
- No translation key added or removed.

## Verification

- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test src/components/ui/skeleton src/components/feature-voting src/components/content-translation src/components/admin/voting-round src/components/service/trial-instances src/components/filigran-ui src/components/organization`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `node ds-migration/validate.mjs ds-migration/specs/3693-skeleton.md`

## Decisions

- **`bg-feedback-neutral-secondary`, the `ProgressBar` empty track**: the one design system surface that stands for
  "not filled yet", visible on every layer in both themes (gray-400 light, gray-600 dark). The legacy
  `bg-text-secondary/50` is a text colour used as a fill, with no design system token.
- **`rounded-sm`**: the design system's 4px radius, the `ProgressBar` track's; the legacy `rounded` was 4px too.
  tailwind-merge resolves a caller's `rounded-full` against it.
- **`motion-safe:animate-pulse`**: the design system gates every animation on reduced motion (`Spinner`'s
  `motion-safe:animate-spin`, the `motion-reduce:transition-none` of `Dialog`, `Menu`, `Select`). Tailwind's own
  `animate-pulse` keyframes stay: the design system ships no pulse of its own.
- **No variant and no size**: every caller sizes and shapes the placeholder to the content it stands for; a text, a
  circle or a block variant would encode what one `className` already says.
- **No screenshot of the skeleton** (human answer on #3693): it only renders while a query is in flight, so any screen
  of it races the network, and holding a request would mean extending `screenshot.mjs` for one component. The screen
  is the loaded page, and `Skeleton.test.tsx` covers the fill, radius and pulse classes.
- **No `aria-hidden` and no `role`**: the legacy had none and an empty `div` is already ignored. The busy state
  belongs to the region (`Spinner` RULE-02), which no call site sets: a later epic.

## To validate

- Every placeholder goes from `bg-text-secondary/50` (half the secondary text colour) to
  `bg-feedback-neutral-secondary`, solid gray. Alternative: `bg-elevation-highlight`, which follows the `layer-N` of
  its surface like the input fill, but is barely distinct from the page in the light theme (gray-150 on gray-100).
- The pulse stops for users who ask for reduced motion. Alternative: always pulse, as the legacy did.
- `category: 'feedback'` in the meta, next to `Spinner` and `ProgressBar`. Alternative: `data-display`.

## Deferred findings

- Eight of the twelve usages (`w-full inset-1/2`, every `page-loader` and `FeatureVotingList`) render a zero-height
  `div`: no height class, no content, and `inset-1/2` does nothing on a static element. Those pages show nothing
  while they load; a sized placeholder or a `Spinner` would.
- No region that loads sets `aria-busy`, so assistive technology hears nothing while a skeleton shows.
- No test renders a call site in its loading state: only `Skeleton.test.tsx` checks the placeholder.
- `SkeletonProps` takes every native `div` prop, `children`, `role` and `aria-label` included, as the legacy did: the
  meta's "empty and unnamed" note holds only while callers pass none. An upstream version could omit them from the
  type.
