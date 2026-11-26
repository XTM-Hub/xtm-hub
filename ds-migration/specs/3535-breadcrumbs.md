---
key: 3535-breadcrumbs
issue: 3535
epic: epic-2-composites
kind: ds # ds | candidate | adoption | cleanup
legacy_symbols: [Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator]
target_module: "@filigran/design-system"
target_symbols: [Breadcrumbs]
legacy_files_to_delete: [apps/frontend/src/components/filigran-ui/components/servers/Breadcrumb.tsx]
---

# Breadcrumb → `@filigran/design-system` `Breadcrumbs`

## Intent

The legacy `Breadcrumb*` parts have one consumer, the app wrapper `src/components/ui/BreadcrumbNav.tsx`, which every
page uses (over 35 render sites). Its body becomes the data-driven design system `Breadcrumbs`; its props
(`value: BreadcrumbNavLink[]`), its translation of labels (`original`, `fallback`) and every call site stay as they are.
Each entry keeps its label, its destination and its order.

## Props mapping

`BreadcrumbNav` keeps its name, its `BreadcrumbNavLink` type and `renderLabel`. It builds `items` from `value` and
renders `<Breadcrumbs items={items} linkComponent={Link} className="pb-s sm:pb-l" />` (`Link` from `next/link`, which
reads `href`). The `Fragment` loop, `cn`, the separators and every colour or hover class go: the component owns them.

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| `<Breadcrumb className="pb-s sm:pb-l">` + `<BreadcrumbList className="pl-0">` | `className="pb-s sm:pb-l"` on `Breadcrumbs` (RULE-02); `pl-0` goes, the design system `ol` has no padding | 1 (wrapper) |
| Entry with `href`: `BreadcrumbItem` > `BreadcrumbLink asChild` > `<Link className="hover:underline text-text-default-disabled" href>` | `{ label: renderLabel(link), href }`, rendered through `linkComponent={Link}`; stays a link wherever it sits, the last position included | Every page but the 14 admin list pages (`Settings` > page) |
| Last entry without `href`: `BreadcrumbPage` (`aria-current="page"`, `role="link"`, `aria-disabled`) | `{ label: renderLabel(link), current: true }` | Every page but `PrivateHomepage` and `admin/voting-rounds/[id]` |
| Entry without `href` that is not last: `BreadcrumbPage` recoloured `text-text-default-primary` | `{ label: renderLabel(link) }`: an unlinked ancestor, no `current` | `MenuLinks.Settings` on every admin page, the organisation name in `subscribed-services`, the bundle name in `manage-users` |
| `BreadcrumbSeparator` between entries, the last one recoloured `text-text-default-primary` | Nothing: the component draws the `/` separators | 1 (wrapper) |
| `value={[]}` (only `ShareableResourceSlug.test.tsx`) | Unchanged; `Breadcrumbs` renders nothing for an empty `items` | 0 in the app |

## Files in scope

- `apps/frontend/src/components/ui/BreadcrumbNav.tsx`
- `apps/frontend/src/components/ui/BreadcrumbNav.test.tsx` (new): a linked entry is a `link` with its `href`; the last
  entry without `href` carries `aria-current="page"` and is not a link; an earlier entry without `href` is text
  without `aria-current`; a last entry with `href` stays a link; `original` shows the label as is and `fallback`
  replaces a missing key. Uses `testRender` and the `next-intl` mock of `.claude/rules/testing.md`.
- `apps/frontend/src/components/filigran-ui/components/servers/index.ts` (drop `export * from './Breadcrumb'`)
- `apps/frontend/src/components/filigran-ui/components/servers/Breadcrumb.tsx` (delete)
- No call site and no e2e locator changes: `user.spec.ts` and `user.pageModel.ts` find
  `getByRole('navigation').getByRole('link', { name: 'Users', exact: true })`, a sidebar link; the breadcrumb never
  holds a `Users` link, and its current entry loses the legacy `role="link"`, so it can only match less.

## Screens

```json
[
  {
    "name": "trial-guide-breadcrumb",
    "path": "/app/service/xtm-platform-trial-guide",
    "steps": [{ "click": "role=button[name=\"Reject all\"]" }],
    "clip": "role=navigation[name=\"breadcrumb\"i]"
  },
  {
    "name": "admin-parameters-page",
    "path": "/app/admin/parameters",
    "steps": [{ "click": "role=button[name=\"Reject all\"]" }, { "waitFor": "role=navigation[name=\"breadcrumb\"i]" }]
  },
  {
    "name": "home-last-entry-link",
    "path": "/app",
    "steps": [{ "click": "role=button[name=\"Reject all\"]" }],
    "clip": "role=navigation[name=\"breadcrumb\"i]"
  }
]
```

## Out of scope

- The 37 call sites and their `value` arrays, including `SubscriptionSlug`'s label translated twice (Deferred findings).
- `BreadcrumbNav`'s name, file location and props; moving call sites to `Breadcrumbs` directly.
- The legacy `theme.css`, `@radix-ui/react-slot` and `MoreHorizIcon` users elsewhere (cleanup 3708).
- No `adornment`, no `label`, no `to`: the legacy had no trailing content and no translated landmark name.

## Accessibility and i18n

- The landmark stays `nav > ol > li`; its name goes from the legacy hard-coded `breadcrumb` to the design system
  default `Breadcrumb` (English in both cases, see Deferred findings). No e2e or unit test reads it.
- The current entry keeps `aria-current="page"` but is a plain `span`, no longer a fake `role="link"` with
  `aria-disabled`. Unlinked ancestors lose the `aria-current="page"` the legacy put on every entry without `href`: only
  the last one carries it. Both come with the component and cannot be kept without restyling its markup.
- Links stay `<a href>` through Next `Link`, named by their label: `FeatureVotingList.test.tsx`
  (`findByRole('link', { name: 'Epic.XTMRoadmap' })` + `href`) and the `getByText` assertions of `TrialGuidePage`
  and both `xtm-platform-trial` page tests still match.
- Every entry gains a native `title` with its full label (component behaviour).
- No translation key added or removed.

## Verification

- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test src/components/ui src/components/feature-voting src/components/service src/components/homepage src/components/filigran-ui "app/(public)/[locale]/cybersecurity-solutions" "app/(application)/app/(user)/service/xtm-platform-trial"`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `node ds-migration/validate.mjs ds-migration/specs/3535-breadcrumbs.md`

## Decisions

- **Keep the wrapper, swap its body**: all 37 sites share one shape (`value` of keys with `original` / `fallback`),
  and the translation logic is the app's, not the component's. Inlining `Breadcrumbs` at each site would duplicate
  `renderLabel` 37 times and is not part of a swap.
- **`href` with `linkComponent={Link}`**, not `to`: Next's `Link` reads `href`, which the contract's migration table
  allows ("link components that read it (e.g. Next's `Link`)"); `to` is for react-router.
- **`current` only on a last entry without `href`**: that is what the legacy marked as the page (bold, primary). A last
  entry with `href` (`PrivateHomepage`'s lone `Home`, `admin/voting-rounds/[id]`'s `Voting rounds`) stays a link, as
  the call site asks; setting `current` would silently drop its destination (contract: a current item is never a link).
- **Spacing on the component**: `pb-s sm:pb-l` moves from the legacy `nav` to `Breadcrumbs`' `className` (RULE-02).
- **Control names translated** (epic review, see 3545).

## To validate

- [x] Breadcrumbs take the design system look: 14px regular secondary text, links permanently underlined (the legacy
  showed grey text underlined on hover only), current entry bold primary, every `/` separator primary. Alternative:
  none without restyling.
- [x] Unlinked ancestors (`Settings` on every admin page) turn from bold primary, indistinguishable from the current
  page, to regular secondary text. Alternative: none without restyling.
- [x] Long paths truncate on one line with an ellipsis and a native `title` tooltip, the ancestors shrinking first and the
  current entry capped at 32rem, where the legacy wrapped onto several lines. Alternative: none without restyling.
- [x] `PrivateHomepage` (`Home` on `/app`) and `admin/voting-rounds/[id]` (last entry `Voting rounds`) keep a link as
  their last entry and so have no current entry. Alternative: mark it `current` and drop the link.

## Deferred findings

- `SubscriptionSlug.tsx:102` passes `t('Service.Management.ManageUsers')` without `original: true`, so
  `BreadcrumbNav` runs `t()` on an already translated string. Pre-existing, unchanged by this item.
- `admin/voting-rounds/[id]` has no entry for the round itself: its last entry is a link to the list. A content fix for
  that page, not a swap.
- On a viewport narrower than the current entry's label (up to 32rem), `Breadcrumbs` overflows its line: the current
  entry never shrinks, the ancestors collapse to an ellipsis. Its contract calls this case unreachable in the product
  shells, but the app's pages render it on phones (`pb-s sm:pb-l`). Raise it upstream; not fixable without restyling.
- In content edit mode, `useTranslate` appends invisible key markers to each label, and `Breadcrumbs` copies the label
  into a `title` that `EditModeContentObserver` does not clean (it walks text nodes only): the tooltip carries the
  markers and keeps the old text after an override. New with the component's `title`; edit mode only.
