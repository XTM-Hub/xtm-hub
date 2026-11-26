---
key: 3534-badge
issue: 3534
epic: epic-1-primitives
kind: ds # ds | candidate | adoption | cleanup
legacy_symbols: [Badge, badgeVariants, BadgeProps]
target_module: "@filigran/design-system"
target_symbols: [Chip]
legacy_files_to_delete: [apps/frontend/src/components/filigran-ui/components/servers/Badge.tsx]
---

# Badge → `@filigran/design-system` `Chip`

## Intent

Every legacy `Badge` is a read-only label (a status, a tag, a product, an EE marker), never a count on an anchor. The
design system's `Badge` is a notification marker; its `Chip` contract maps `@filigran/ui <Badge>` (read-only) to
`<Chip severity="…" />`. Every call site becomes a `Chip` with the same text; what each label says, and where, stays.
This item also closes #3542 (Chip).

## Props mapping

`Chip` takes its text in `label` (a `string`), owns its fill, text colour, 14px typography, 24px height, radius and
250px truncation with a full-label tooltip. Every class that coloured, bordered, sized or set the font of the legacy
badge goes (`border-*`, `bg-*`, `text-*`, `content-*`, `font-*`, `h-6`, `p-l`, `truncate`, `capitalize`); layout
classes stay (`shrink-0`, `min-w-0`, `max-w-full`, `ml-s`, `mr-s`, `w-full`, `invisible`, `absolute`).

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| `<Badge>{text}</Badge>`, `variant="outline"` or `"default"`, or a `className` that only recolours it (`bg-feedback-info-*`, `bg-elevation-*`, `bg-primary/20`) | `<Chip label={text} />` (neutral) | `Parameters`, `RolePortalCapabilitiesList`, `CapabilityDescription`, `UserList` organisations, `OrganizationList` domains, `OrganizationSubscribedServices` ×3, `VotingRoundDetail` ×2, `UseCases` products, `SolutionCategories`, `ServiceSlugHeader`, `SubscriptionSlug` (drops `capitalize`: the value is `ACCESS`), `HomepageResourceCard` footer tags, `FeatureVoteCard`, `FeatureVoteDetail`, `BundleProductCard`, `BundleInfoCard` licence, `RegisteredPlatformCard` contract, `ConnectedProductItem` trial |
| Text + leading icon children | `<Chip label={text} startIcon={<Icon className="size-4" />} />` | `RegisteredPlatformCard` platform, `ShareableResourceEntityTypes` |
| `color={hex}` (use cases) | `<Chip label={name} color={hex} />` (bounded wash) | `UseCases` name, `BadgeOverflowCounter` |
| `variant="destructive"` | `severity="critical"` | `NewsFeedList` deleted, `UserList` disabled and invitation expired |
| `variant="warning"` | `severity="medium"` | `EpicAdminMenu` draft, `UserList` invitation pending |
| `variant="secondary"` for an enabled account | `severity="low"` | `UserList` enabled |
| `VotingRoundStatusBadge`: Draft `outline`, Open `default`, Closed `secondary` | Draft `medium`, Open `low`, Closed `neutral`; `BADGE_VARIANT` becomes a `ChipSeverity` record | 1 |
| `TrialsProducts` `CLASS_NAME_BY_HUB_STATUS` text colours: success, alert, neutral | `SEVERITY_BY_HUB_STATUS`: `low`, `medium`, `neutral`; the `TooltipTrigger asChild` child becomes `<span className="inline-flex">` around the `Chip` | 1 |
| `RegisteredPlatformCard` remaining days: `resolveTrialDaysBadgeClassName` error / alert / success fills | `resolveTrialDaysSeverity`: `critical` (≤ 8), `medium` (≤ 22), `low` | 1 |
| `BundleInfoCard` remaining days, success fill | `severity="low"` | 1 |
| `BundleProductCard` product name, `truncate` in a `min-w-0` row | `<Chip label={…} className="min-w-0" />` (neutral) | 1 |
| EE marker: gradient border + gradient text (`RegisteredPlatformCard`), `bg-filigran-tonic-primary` (`ConnectedProductItem`), `EpicItemFooter` edition `secondary` (EE, Partial EE) | `severity="ee"`; `RegisteredPlatformCard` drops `customStyle` and the gradient variables | 3 |
| `XtmPlatformTrialBanner` days left: `outline` + `border-black-1000` + black semibold text | `<span className="light"><Chip label={…} /></span>` (neutral): the banner gradient is light in both themes, so the chip resolves the light tokens | 1 |
| `LastDeployedResourceRow` icon-only badge around `CalendarMonthIcon` | The icon alone, `className="size-4 shrink-0"`, no wrapper; `BADGE_CLASS` goes | 1 |
| `BadgeOverflowCounter`: first, visible, measuring and tooltip badges, `+N` counter; `badgeClassName` prop | `Chip` for each, `label={getBadgeLabel(name)}`, `color`; the first keeps `min-w-0 max-w-full` and drops `title` and its inner `span.truncate` (the chip's own tooltip shows the full label); `+N` is `<span className="inline-flex shrink-0"><Chip label={`+${hiddenCount}`} /></span>` as the trigger. `badgeClassName` is removed from the props and from `HomepageResourceCard` and `LastDeployedResourceRow` | 1 (+2 callers) |
| `SelectUsers`, legacy `MultiSelect`: removable badge (remove `span` inside the popover trigger `Button`) and `+N...` | `<span className="inline-flex items-center gap-xs"><Chip label={label} />{same remove span without its `ml-s`, same handlers and aria-label}</span>`; `<Chip label={`+${hiddenCount}...`} />` | 2 |
| Legacy `tag-input/Tag`: `Badge` with `tagVariants` colours, `onClick`, a `CloseIcon` with `onClick` | `<Chip label={tagObj.text} onClick={onTagClick && !disabled ? () => onTagClick(tagObj) : undefined} onDelete={() => onRemoveTag(tagObj.id)} disabled={disabled} />`; keeps `w-full justify-between` for `direction="column"` and, for `isActiveTag`, `ring-2 ring-focus ring-offset-1 ring-offset-focus`; drops `tagVariants` colours, `cursor-*`, `opacity-50` and `tagClasses` from the rendering. `tagVariants` stays exported for `TagInput`'s props until 3701 | 1 (legacy) |

## Files in scope

- `apps/frontend/src/components/admin/`: `parameters/Parameters.tsx`, `news-feed/NewsFeedList.tsx`,
  `use-case/UseCases.tsx`, `solution-category/SolutionCategories.tsx`, `voting-round/VotingRoundStatusBadge.tsx`,
  `voting-round/VotingRoundDetail.tsx`, `user/UserList.tsx`, `user/CapabilityDescription.tsx`,
  `role/RolePortalCapabilitiesList.tsx` and its `.test.tsx` (a `null` capability renders no chip)
- `apps/frontend/src/components/organization/OrganizationList.tsx`,
  `organization/[slug]/subscribed-services/OrganizationSubscribedServices.tsx` and its `.test.tsx` (drop `Badge` from
  the `@filigran/ui` mock)
- `apps/frontend/src/components/homepage/`: `registered-platforms/RegisteredPlatformCard.tsx`,
  `resources/HomepageResourceCard.tsx`, `last-deployed-resources/LastDeployedResourceRow.tsx`
- `apps/frontend/src/components/trials/tab/TrialsProducts.tsx` and `TrialsProducts.test.tsx`: the colour test asserts
  the chip fills (`bg-feedback-success-secondary-transparency-30`, `-alert-`, `-neutral-`) on the element holding the
  label, instead of the legacy text colours
- `apps/frontend/src/components/connected-products/ConnectedProductItem.tsx`
- `apps/frontend/src/components/epic/epic-item/EpicAdminMenu.tsx`, `epic-item/EpicItemFooter.tsx`
- `apps/frontend/src/components/feature-voting/FeatureVoteCard.tsx`, `FeatureVoteDetail.tsx`
- `apps/frontend/src/components/service/[slug]/ServiceSlugHeader.tsx`, `subcription/[slug]/SubscriptionSlug.tsx`
- `apps/frontend/src/components/service/document/ui/ShareableResourceEntityTypes.tsx`
- `apps/frontend/src/components/service/trial-instances/banner/xtm-platform-trial/XtmPlatformTrialBanner.tsx`,
  `xtm-platform-trial/active-bundle/BundleInfoCard.tsx`, `active-bundle/BundleProductCard.tsx`
- `apps/frontend/src/components/ui/BadgeOverflowCounter.tsx`, `ui/SelectUsers.tsx`
- `apps/frontend/src/components/filigran-ui/components/clients/MultiSelect.tsx`, `clients/tag-input/Tag.tsx`
- `apps/frontend/src/components/filigran-ui/components/servers/index.ts` (drop the `Badge` export)
- `apps/frontend/src/components/filigran-ui/components/servers/Badge.tsx` (delete)

## Screens

```json
[
  {
    "name": "home-registered-platforms",
    "path": "/app",
    "steps": [{ "click": "role=button[name=\"Reject all\"]" }],
    "clip": "section:has-text(\"Welcome to XTM Hub\")"
  },
  {
    "name": "admin-users",
    "path": "/app/admin/user",
    "steps": [{ "click": "role=button[name=\"Reject all\"]" }],
    "clip": "table"
  },
  {
    "name": "admin-use-cases",
    "path": "/app/admin/use-case",
    "steps": [{ "click": "role=button[name=\"Reject all\"]" }],
    "clip": "table"
  }
]
```

## Out of scope

- `CountBadge` (`ui/CountBadge.tsx`): a hand-rolled count, not the legacy `Badge`; adopting the design system `Badge`
  there is an adoption item.
- `EeBadge`, `VotingRoundStatusBadge`'s and `BadgeOverflowCounter`'s names, the `BadgeOverflow` type and the
  `Badge.*` translation keys: names only.
- Tag input behaviour, `TagList`, `TagPopover`, `TagInput` (3701); the trigger structure of `SelectUsers` and
  `MultiSelect` (Select / Combobox migrations).
- The legacy `theme.css` and the `@filigran/ui` aliases (cleanup 3708).

## Accessibility and i18n

- A read-only `Chip` is a `span`, not focusable, like the legacy `div`; its text stays its content, so
  `getByText`, `getByRole('cell', { name: 'Disabled' })` (`apps/e2e/tests/tests_files/user.spec.ts`) and every unit
  test querying a label still match. No e2e locator changes.
- `BadgeOverflowCounter`'s hidden measuring chips keep `aria-hidden`. The `+N` and `TrialsProducts` tooltip triggers
  are a plain `span` around the `Chip`, never the `Chip` itself: `TooltipTrigger` always passes an `onClick`, and a
  `Chip` with `onClick` renders a focusable `<button>` (a button inside the homepage card links).
- The `Tag` remove control becomes the chip's `IconButton`, named `Remove {text}` and reachable by keyboard, where the
  legacy `CloseIcon` was mouse-only. The `SelectUsers` and `MultiSelect` remove spans keep their `aria-label`s.
- No new translation key.

## Verification

- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test src/components/admin src/components/organization src/components/homepage src/components/trials src/components/connected-products src/components/epic src/components/feature-voting src/components/service src/components/subcription src/components/ui src/components/filigran-ui`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `node ds-migration/validate.mjs ds-migration/specs/3534-badge.md`

## Decisions

- **`Chip`, not the design system `Badge`**: the `Badge` contract (RULE-01) says a standalone token that carries its own
  meaning is a `Chip`, and the `Chip` contract's migration table maps the legacy `Badge` to it. No legacy usage marks
  an anchor with a count; the `+N` overflow counters sit in a row of chips and read as one more token.
- **Severity translates the legacy colour, one to one**: tags, products, names, capabilities and contracts are
  `neutral` (RULE-02: severity only mirrors a real status). A status keeps the meaning its legacy badge had:
  `destructive` or error `critical`, `warning` or alert `medium`, success `low`, and every other variant
  (`default`, `secondary`, `outline`, no colour) `neutral`. So a disabled user, an expired invitation and a deleted
  news are `critical`; a pending invitation, a draft epic and a pending, provisioning or queued product `medium`; an
  active product, an enabled user and a trial's remaining days above the thresholds `low`; every voting round
  status, a cancelled, expired or failed product and a service `creation_status` `neutral`. The enabled user is the
  exception to `secondary`: the legacy theme painted that variant turquoise, so users saw a coloured "Enabled" next to
  the red "Disabled", and the team asked to keep it green (PR #3715 feedback). The same word can take
  two colours ("Expired" invitation `critical`, "Expired" product `neutral`) when the legacy gave it two.
- **EE markers use `severity="ee"`**, the contract's EE family, instead of the hand-written gradients.
- **The calendar badge is not a token**: it holds no text, and `Chip` requires a label, so the icon stays without a
  fill.
- **Remove controls inside a trigger `Button` stay outside the chip**: a `Chip` with `onDelete` renders a `<button>`,
  and a button inside the popover trigger button is invalid HTML. The sibling span keeps the legacy behaviour.
- **`BadgeOverflowCounter` loses `badgeClassName`**: its two callers only used it to recolour the chips.

## To validate

- [x] Every label takes the design system chip (filled, no border, 14px regular text, 4px radius) instead of the legacy
  outlined badge tinted with `currentColor`, in both themes. Alternative: none without restyling.
- [x] Use-case tags on the homepage cards, last deployed resources and feature votes, platform and instance names, and
  the trial contract labels turn from the info-blue fill to `neutral`. Alternative: `severity="info"`.
- [x] Pending invitation and draft epic turn from orange to the amber `medium`; the alternative is `high` (orange).
- [x] The EE markers (registered platform, connected product, epic edition) become the solid tonic EE chip instead of a
  gradient outline, a tonic fill or a teal outline. Alternative: none without restyling.
- [x] The trial banner's days-left chip loses its black outline and black text on the blue gradient; it takes the neutral
  chip, scoped to the light theme because the gradient stays light in dark mode. Alternative: plain banner text
  without a chip. Superseded by 3688: the gradient is gone, the chip is a plain neutral chip.
- [x] The last deployed resources' calendar icon loses its brand-tinted square. Alternative: a neutral `Chip` holding the
  date as its label, which changes the sentence.
- [x] In `SelectUsers` the remove cross sits next to the chip instead of inside it. Alternative: drop it, since the field
  holds one user and has a clear-all control. Superseded by 3700: `SelectUsers` is a single combobox showing the
  author as text.
- [x] Long labels truncate at 250px with a tooltip instead of wrapping or overflowing (domains, capabilities).

## Deferred findings

- The bundle page's remaining-days chip is `low` whatever the count, while the homepage platform card turns `medium`
  at 22 days and `critical` at 8. Pre-existing (the legacy badges did the same), so the migration keeps it: #3730
  shares the thresholds.
- `tag-input/Tag.tsx`: `TagProps` still declares `variant`, `tagClasses` and `draggable`, which `Tag` no longer reads,
  so `TagInput`'s `variant` and `styleClasses.tag` do nothing. Remove them with the tag input migration (3701).
- `tag-input/Tag.tsx`: the chip's delete button is named by the design system's English default `Remove {text}`; the
  legacy icon had no name. Pass a translated `deleteLabel` when the tag input moves off `filigran-ui` (3701). The
  `SelectUsers` and `MultiSelect` remove labels were already hardcoded English.
- `ShareableResourceEntityTypes`: `EntityTypeIcon` keeps its inline entity hex colour, which overrides the chip's icon
  tone; the `Chip` contract carries entity colour through `entity` (`ChipEntity`). Mapping entity types to those
  families is a design decision outside this item.
- Every `Chip` mounts its own tooltip tree for the truncated label, and that tooltip only opens on hover (not on
  keyboard focus or touch for a read-only chip). Library behaviour, to raise upstream if tables of chips profile slow.
- `TrialsProducts`: the deployment status is carried by the chip colour and a hover-only tooltip, as in the legacy
  badge, and a product without `platform_identifier` still draws an empty chip. Put the status in text when the
  trials table is reworked.
- `SelectUsers` and `MultiSelect` reserve a fixed 56px for the `+N...` counter, sized for the legacy 12px badge; the
  14px chip is a few pixels wider, so the counter may clip in a full, narrow trigger. Re-measure with the Select and
  Combobox migrations, which own the trigger structure.
- Coverage left as before: `resolveTrialDaysSeverity` thresholds, the `VotingRoundStatusBadge`, `UserList`,
  `NewsFeedList`, `EpicAdminMenu` and EE (`RegisteredPlatformCard`, `ConnectedProductItem`, `EpicItemFooter`)
  severities, the `UseCases` colour, the trial banner's light scope, `BadgeOverflowCounter`, `SelectUsers`,
  `MultiSelect` and `Tag` have no unit test. The
  `TrialsProducts` colour test asserts the chip's internal fill classes, as this spec asks, and covers three of the
  seven statuses.
