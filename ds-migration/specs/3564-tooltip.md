---
key: 3564-tooltip
issue: 3564
epic: epic-1-primitives
kind: ds # ds | candidate | adoption | cleanup
legacy_symbols: [SimpleTooltip, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger]
target_module: "@filigran/design-system"
target_symbols: [Tooltip, TooltipContent, TooltipProvider, TooltipTrigger]
legacy_files_to_delete: [apps/frontend/src/components/filigran-ui/components/clients/Tooltip.tsx]
---

# Tooltip → `@filigran/design-system`

## Intent

Every tooltip moves to the design system compound `TooltipProvider` > `Tooltip` > `TooltipTrigger` + `TooltipContent`,
which has the same Radix API as the legacy copy. What each tooltip says, when it opens and what it is attached to stay
the same for users. The legacy `SimpleTooltip` has no design system equivalent and becomes the compound at its three
call sites.

## Props mapping

The four parts keep their names and Radix props (`delayDuration`, `disableHoverableContent`, `asChild`, `side`,
`align`, `alignOffset`, `sideOffset`): only the import moves. The design system `TooltipContent` owns its colours,
typography, padding, radius, 300px max width, 8px offset and default `side="top"`. Every `className` that resized or
recoloured the legacy bubble goes. Content markup inside the bubble (`<p>`, spans) stays unless a row says otherwise.

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| Compound, `<TooltipTrigger asChild>`, `TooltipContent` without `className` (some with `side`/`align`, `delayDuration`, `disableHoverableContent`) | Same JSX, import switched to `@filigran/design-system` | 22 (`EpicForm`, `EpicList`, `TrialsTab` ×3 actions, `TrialsProducts`, `RegisteredPlatformCard`, `LastDeployedResourceRow`, `UserServiceForm`, `ShareableResourceCardVersion`, `BadgeOverflowCounter`, `UserDisplay`, `SelectUsers`, `IntegrationProductVersionFilter`, `ResourceStatusIcons`, `ShareLinkButton`, `IntegrationsCsvExportButton`, `ShareableResourceSlug`, `PublicResourceActions` download, `ShareableResourceDetailsLink`, `MultipleImagesField` ×2) |
| `TooltipContent className` that only sizes the bubble: `max-w-md`, `max-w-xl`, `max-w-sm whitespace-normal`, `whitespace-nowrap` | `<TooltipContent>` without `className` | 5 (`TrialsProductValues`, `TrialsTab` cancellation reason, `HomepageResourceCard` ×2, `ChoosePlatformForm`) |
| `TooltipContent className` that recolours the bubble: `bg-elevation-border-subtle-layer-0 dark:… text-text-default-primary` | `<TooltipContent>` without `className` | 2 (`ManageTrialHeader`) |
| `NavigationLinks` `PublicSubLink`: `<TooltipContent className="bg-ds-bg-4 dark:bg-ds-bg-4 rounded">` + label `span.content-body-base.text-text-default-primary` + description `span.content-body-base.text-muted-foreground` | `<TooltipContent>` without `className`; the `div.flex.flex-col.gap-0.5` stays, the label `span` loses its classes, the description `span` becomes the design system `text-default-secondary` | 1 |
| `EeBadge`: `<TooltipContent align="end" alignOffset={-9} sideOffset={9} className={cn(EE_GRADIENT)}>` | Same positioning props, no `className`; the badge button keeps its gradient | 1 |
| `DocumentShortDescriptionCell`: `<TooltipTrigger className="block w-full truncate text-left">` (no `asChild`) + `<TooltipContent className="max-w-lg">` | Same trigger and `className`; `TooltipContent` without `className` | 1 |
| `<SimpleTooltip title={text}>{disabled Button}</SimpleTooltip>` | `<TooltipProvider><Tooltip><TooltipTrigger asChild><span tabIndex={0} className="inline-flex">{same children}</span></TooltipTrigger><TooltipContent>{text}</TooltipContent></Tooltip></TooltipProvider>` | 3 (`OneClickDeploy`, `ShareableResourceConnectorSlug`, `PublicResourceActions` deploy) |
| `LogoField`: `<TooltipProvider delayDuration={1}>` around a preview with no tooltip inside | Provider removed, its child `div` unchanged | 1 |
| Legacy `MultiSelect`: compound imported from `'../clients'` | Same JSX, imported from `@filigran/design-system` | 1 (legacy) |

## Files in scope

- `apps/frontend/src/components/epic/EpicForm.tsx`, `epic/EpicList.tsx`
- `apps/frontend/src/components/trials/tab/TrialsTab.tsx`, `TrialsProducts.tsx`, `TrialsProductValues.tsx`
- `apps/frontend/src/components/homepage/registered-platforms/RegisteredPlatformCard.tsx`,
  `homepage/last-deployed-resources/LastDeployedResourceRow.tsx`, `homepage/resources/HomepageResourceCard.tsx`
- `apps/frontend/src/components/menu/navigation/shared/NavigationLinks.tsx`
- `apps/frontend/src/components/ui/BadgeOverflowCounter.tsx`, `ui/UserDisplay.tsx`, `ui/SelectUsers.tsx`,
  `ui/ResourceStatusIcons.tsx`, `ui/share-link/ShareLinkButton.tsx`,
  `ui/shareable-resource/card-design/ShareableResourceCardVersion.tsx`,
  `ui/shareable-resource/integration/IntegrationProductVersionFilter.tsx`
- `apps/frontend/src/components/service/[slug]/UserServiceForm.tsx`, `service/form/LogoField.tsx`,
  `service/form/MultipleImagesField.tsx`, `service/components/DocumentListCells.tsx`,
  `service/components/header/IntegrationsCsvExportButton.tsx`
- `apps/frontend/src/components/service/document/ShareableResourceSlug.tsx`, `PublicResourceActions.tsx`,
  `ShareableResourceDetailsLink.tsx`, `connector/ShareableResourceConnectorSlug.tsx`,
  `one-click-deploy/OneClickDeploy.tsx`, `one-click-deploy/EeBadge.tsx`, `one-click-deploy/ChoosePlatformForm.tsx`
- `apps/frontend/src/components/service/trial-instances/xtm-platform-trial/manage-trial/ManageTrialHeader.tsx`
- `apps/frontend/src/components/filigran-ui/components/clients/MultiSelect.tsx`
- `apps/frontend/src/components/filigran-ui/components/clients/index.ts` (drop the `Tooltip` export)
- `apps/frontend/src/components/filigran-ui/components/clients/Tooltip.tsx` (delete)
- Tests whose mock targets the legacy module: `ui/ResourceStatusIcons.test.tsx`,
  `ui/shareable-resource/card-design/ShareableResourceCardIcon.test.tsx` and `ShareableResourceCardVersion.test.tsx`
  move their `vi.mock('@filigran/ui/clients', …)` to a partial
  `vi.mock('@filigran/design-system', async (importOriginal) => ({ ...(await importOriginal()), Tooltip…, }))` with the
  same four stubs; `trials/tab/TrialsTab.test.tsx` drops the four `Tooltip*` entries of its `@filigran/ui` mock.
- `service/document/PublicResourceActions.test.tsx`: one test that the disabled deploy button sits in a focusable
  trigger (`tabIndex=0`) and that focusing it shows `Service.Connectors.UnavailableDeployments`.

## Screens

```json
[
  {
    "name": "home-platform-title",
    "path": "/app",
    "steps": [
      { "hover": "p.text-content-body-compact.truncate" },
      { "waitFor": "role=tooltip" }
    ]
  },
  {
    "name": "integrations",
    "path": "/app",
    "steps": [
      { "click": "role=button[name=\"OpenCTI\"]" },
      { "click": "role=link[name=\"Integrations\"]" },
      { "waitFor": "role=button[name=\"Export CSV\"]" },
      { "hover": "role=button[name=\"Export CSV\"]" },
      { "waitFor": "role=tooltip" }
    ]
  },
  {
    "name": "integrations-list-description",
    "path": "/app",
    "steps": [
      { "click": "role=button[name=\"OpenCTI\"]" },
      { "click": "role=link[name=\"Integrations\"]" },
      { "click": "role=button[name=\"Select list view\"]" },
      { "hover": "td button.truncate" },
      { "waitFor": "role=tooltip" }
    ]
  }
]
```

## Out of scope

- `AutoFormTooltip` (`filigran-ui/components/auto-form/common/Tooltip.tsx`): a field description paragraph, not the
  legacy tooltip; it goes with AutoForm (item 3707).
- The trigger children: legacy `Badge` in `TrialsProducts` (3534), legacy `Form` parts, `AlertDialogComponent`.
- `ManageTrialHeader`'s disabled "Group action" trigger stays a non-focusable `div` with its `w-fit` and inline
  `cursor: unset`; `OneClickDeploy` still passes its `buttonWithBadge` to the incompatible-platform trigger, although
  that tooltip only shows when no `EeBadge` renders.
- Hoisting the per-call-site `TooltipProvider`s into one app-level provider.
- `@radix-ui/react-tooltip` in `package.json`, the legacy `theme.css` and the `@filigran/ui` aliases (cleanup 3708).

## Accessibility and i18n

- Radix still sets `role="tooltip"` and `aria-describedby` on every trigger; every `aria-label` stays.
- `SimpleTooltip`'s trigger was a `<button>` wrapping the disabled `Button` (a nested button). It becomes a focusable
  `span` (`tabIndex={0}`), so keyboard users still reach the reason the action is disabled, as decided for the disabled
  one-click deploy platforms in the Input spec. The disabled `Button` keeps its name;
  `PublicResourceActions.test.tsx`'s `closest('button')` still finds it.
- No e2e locator targets a tooltip or the removed wrapper button. No new translation key.

## Verification

- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test src/components/epic src/components/trials src/components/homepage src/components/menu src/components/ui src/components/service src/components/filigran-ui`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `node ds-migration/validate.mjs ds-migration/specs/3564-tooltip.md`

## Decisions

- **The design system bubble wins**: width caps (`max-w-*`), `whitespace-*` and colour overrides are the legacy look
  restated per call site; the design system caps at 300px and wraps long words itself. `whitespace-nowrap` on the card
  title would overflow that cap.
- **Default side follows the design system (`top`)**: the legacy `TooltipContent` forced `side="bottom"` as a default.
  Only `EpicList`, which passes `side="bottom" align="start"` explicitly, keeps bottom.
- **`SimpleTooltip` is inlined, not rebuilt**: the usage contract documents only the compound; three call sites with
  the same disabled-action pattern do not justify a wrapper. The legacy trigger's `w-full` and `cursor: unset` go:
  in the `flex` action rows the `inline-flex` span sizes to the button.
- **`EeBadge` loses the gradient bubble**: a hardcoded hex gradient on a design system surface breaks the tokens-only
  invariant; the badge itself, outside the design system, keeps it.
- **`NavigationLinks`' tooltip content** keeps its two lines but drops the `content-body-base` override (the bubble's
  `content-compact` applies) and replaces the legacy `text-muted-foreground` with the design system secondary text token.
- **`LogoField`'s provider is dead code**: it wraps no `Tooltip`, so it is removed rather than re-imported.
- **Partial mocks in tests**: the components now import tooltips from the module that also exports `Button`,
  `IconButton` and `Badge`, so the stubs spread `importOriginal()`.
- No screen for `SimpleTooltip`, `EeBadge` or `NavigationLinks`: they need a connector without manager support, an
  incompatible platform, an EE-gated platform or the public menu, which the development seed and login do not give.

## To validate

- Every tooltip takes the design system bubble (`bg-tooltip`, `text-default-primary`, compact typography, 8px offset,
  fade only) instead of the dark legacy one, in both themes. Alternative: none without restyling.
- Tooltips open above their trigger by default instead of below. Alternative: pass `side="bottom"` at each call site.
- Long tooltips (cancellation reason, trial product values, card descriptions, one-click deploy platform reasons,
  description cells) wrap at 300px instead of 448 to 576px. Alternative: none without restyling.
- `EeBadge`'s "Enterprise Edition" tooltip loses its cyan-to-green gradient. Alternative: keep `EE_GRADIENT` on
  `TooltipContent`, against the tokens-only rule.
- `ManageTrialHeader` and `NavigationLinks` tooltips lose their custom background. Alternative: keep the overrides.
- The list view description cell trigger shows the design system `cursor-pointer` instead of the default cursor.
  Alternative: render it as a `span tabIndex={0}` under `asChild`.

## Deferred findings

- Legacy `MultiSelect` (`filigran-ui/components/clients/MultiSelect.tsx`) renders removable badges (`role="button"`)
  inside its overflow tooltip, which the design system Tooltip contract forbids ("use Popover instead"), and wraps
  them in `p-s max-w-sm` inside the bubble. Pre-existing; it belongs to the MultiSelect migration.
- `messages/ja.json`: `Service.Connectors.Incompatible` holds the English text. Pre-existing, not a key this item adds.
