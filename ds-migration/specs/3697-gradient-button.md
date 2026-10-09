---
key: 3697-gradient-button
issue: 3697
epic: epic-3-candidates
kind: ds # ds | candidate | adoption | cleanup
legacy_symbols: [GradientButton, GradientButtonProps]
target_module: "@filigran/design-system"
target_symbols: [Button]
legacy_files_to_delete: [apps/frontend/src/components/filigran-ui/components/servers/GradientButton.tsx, apps/frontend/src/components/filigran-ui/components/servers/index.ts]
---

# GradientButton → `@filigran/design-system` `Button`, `highlight` and `ia` variants

## Intent

The legacy `GradientButton` wraps the design system `Button` (left at its `default` × `primary` look) and repaints it
with a hand-made gradient border, glow and gradient label. The design system already ships that role: `Button`
`variant="highlight"` or `"ia"` with `priority="secondary"` draws a token gradient border (`gradient-border-focus` /
`gradient-border-ia`) and a gradient label, and its usage contract sends "gradient props (opencti wrapper)" to those
variants. So no candidate is rebuilt: the four call sites move to `Button` and the legacy file goes. Each keeps its
element (button or link), its label, its icon, its width, its handlers and its destination.

## Props mapping

Every call site imports `Button` from `@filigran/design-system` (added to the existing import when there is one) and
drops the `@filigran/ui/servers` import line. Legacy look classes go: `bg-background dark:bg-none` (the legacy
padding-box fill), `h-9` and `text-content-button` (the design system `md` button already has them), `rounded` (the
design system radius wins), `whitespace-nowrap` (in the `Button` base).

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| `<GradientButton className="h-9 rounded text-content-button whitespace-nowrap bg-background dark:bg-none" + (open ? 'w-full px-2' : 'w-9 px-0') textGradient={open} tabIndex={-1}>{open ? text : <HighlightIcon className="h-4 w-4 text-filigran-brand-primary" …/>}</GradientButton>`, inside the same `<Link className="block">` | `<Button variant="highlight" priority="secondary" tabIndex={-1} className={open ? 'w-full px-2' : 'w-9 px-0'}>`, same children, same wrapping `Link` | 1 (`NavigationLinkMenu` in `NavigationLinks.tsx`, the "XTM Platform Trial" link of the private and public sidebars) |
| `<GradientButton className="bg-background dark:bg-none" onClick disabled={isInFlight}>` | `<Button variant="highlight" priority="secondary" onClick disabled={isInFlight}>`, same label | 1 (`ReachSalesButton.tsx`, `variant="gradient"` branch) |
| `<GradientButton variant="ia" className="bg-background dark:bg-none" tabIndex={-1}>{accessLabel}</GradientButton>`, inside the same external `Link` | `<Button variant="ia" priority="secondary" tabIndex={-1}>{accessLabel}</Button>`, same wrapping `Link` | 1 (`BundleProductCard.tsx`, XTM One access) |
| `<GradientButton asChild textGradient={false} gradientFrom gradientTo gradientBg><Link href><span className="bg-gradient-to-r from-[var(--gradient-from)] to-[var(--gradient-to)] bg-clip-text text-transparent">{label}</span></Link></GradientButton>` | `<Button asChild variant="highlight" priority="secondary"><Link href={href}>{label}</Link></Button>`; the `span` and the comment above the button go (its `--gradient-*` variables no longer exist, so the label would be transparent) | 1 (`FeatureVotingCallout.tsx`) |
| `gradientFrom`, `gradientTo`, `gradientBg` of `FeatureVotingTheme` | removed from the interface and from `THREAD_THEME`, and "the button gradient" from the file comment: nothing reads them any more. `THREAD_LIME`, `THREAD_BLUE` and `THREAD_BACKGROUND` stay, the mosaic uses them | 0 |
| `textGradient`, `GradientButtonProps` | removed: `Button` paints the label gradient itself, and has no `asChild` label gradient | 0 |

## Files in scope

- `apps/frontend/src/components/menu/navigation/shared/NavigationLinks.tsx`
- `apps/frontend/src/components/service/trial-instances/reach-sales/ReachSalesButton.tsx`
- `apps/frontend/src/components/service/trial-instances/xtm-platform-trial/active-bundle/BundleProductCard.tsx`
- `apps/frontend/src/components/feature-voting/FeatureVotingCallout.tsx`
- `apps/frontend/src/components/feature-voting/feature-voting-theme.ts`
- `apps/frontend/src/components/filigran-ui/index.ts` (drop `export * from './components/servers'`)
- `apps/frontend/src/components/filigran-ui/components/servers/GradientButton.tsx` and `servers/index.ts` (delete:
  `GradientButton` is the last export of `servers/`)

No wrapper in `src/components/ui/` wraps it. The existing tests stay as they are and must pass:
`BundleProductCard.test.tsx` (the XTM One access is found by its text, then `closest('a')`),
`FeatureVotingCallout.test.tsx` (`link` named `FeatureVoting.CalloutButton`), `PublicNavigation.test.tsx`
(`Menu.XTMPlatformTrial` by text) and `PrivateNavigation.test.tsx` (the sidebar, without the trial link). The e2e locator
`getByRole('button', { name: 'Reach out to Sales' })` (`xtm-platform-trial-bundle.spec.ts`) keeps matching: the role
and the label do not change. No other e2e locator finds these elements.

## Screens

The sidebar link shows for the dev admin unless its organization is blacklisted from the trial; the expanded and
collapsed sidebars render its text and icon-only forms. The third screen opens the first OpenCTI registration, a
trial in the dev data: its header renders the Reach Sales button only for a trial contract. No dev route renders the
XTM One access (an active bundle) or the callout (an open voting round): the unit tests cover them.

```json
[
  {
    "name": "sidebar-trial-link",
    "path": "/app",
    "steps": [
      { "click": "role=button[name=\"Reject all\"]" },
      { "waitFor": "a[href=\"/app/service/xtm-platform-trial\"] button" }
    ],
    "clip": "li:has(> a[href=\"/app/service/xtm-platform-trial\"])"
  },
  {
    "name": "collapsed-sidebar-trial-link",
    "path": "/app",
    "steps": [
      { "click": "role=button[name=\"Reject all\"]" },
      { "click": "role=button[name=\"Collapse sidebar\"]" },
      { "waitFor": "a[href=\"/app/service/xtm-platform-trial\"] button.w-9" }
    ],
    "clip": "li:has(> a[href=\"/app/service/xtm-platform-trial\"])"
  },
  {
    "name": "reach-sales-header",
    "path": "/app",
    "steps": [
      { "click": "role=button[name=\"Reject all\"]" },
      { "click": "a[href*=\"/service/opencti_registration/\"]" },
      { "waitFor": "role=button[name=\"Reach out to Sales\"]" }
    ],
    "clip": "header:has(button:has-text(\"Reach out to Sales\"))"
  }
]
```

## Out of scope

- The `Link` wrapping an unfocusable `button` in the sidebar and the XTM One card, and the other buttons of
  `ReachSalesButton` and `BundleProductCard`.
- The `@filigran/ui/servers` aliases in `tsconfig.json` and `vitest.config.ts`: shared files, removed with the copy
  (3708). Nothing imports them once this item lands.
- The Thread banner itself (mosaic, colours) and the rest of the feature voting theme.
- The accessibility gaps listed under Deferred findings.

## Accessibility and i18n

- Unchanged: the sidebar and XTM One links keep their `href`, `target`, `rel` and accessible name, the inner `button`
  keeps `tabIndex={-1}`; Reach Sales stays a `button` named "Reach out to Sales"; the callout stays one `link` named
  by its label. `Button` wraps its children in a `span`, which changes no accessible name.
- The design system adds its focus ring (`focus-visible:ring-filigran-tonic-primary` / `-ia-secondary`) to the
  focusable ones: Reach Sales and the callout link.
- In the light theme `Button`'s `highlight` label is solid brand colour, not a gradient, to clear 4.5:1 (its contract).
- No translation key added or removed.

## Verification

- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test src/components/menu src/components/feature-voting src/components/service/trial-instances src/components/filigran-ui`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `node ds-migration/validate.mjs ds-migration/specs/3697-gradient-button.md`

## Decisions

- **`kind: ds`, not `candidate`**: the item sits in epic 3 because the legacy file is a wrapper, but the design system
  covers its role (`Button` `ia` / `highlight`, `Button.md` "Out of scope": gradient props → those variants). A
  candidate would rebuild what the package ships and propose upstream the gradient props its contract rejects, so it
  is not listed as one in the report. Same call as 3694, 3700 and 3701. The commit subject is the `ds` one:
  `feat(frontend): migrate GradientButton to @filigran/design-system (#3697)`.
- **`priority="secondary"`**: the only priority that draws the gradient border; `tertiary` drops it and `primary` is
  forced to `secondary` for these variants (RULE-04).
- **`highlight` for the sidebar, Reach Sales and the callout, `ia` for XTM One**: the legacy variants, by role.
- **The callout's custom gradient goes**: the Thread theme passed lime to blue stops over its near-black canvas. The
  design system takes no gradient stops, and overriding `--gradient-focus` on the button would restyle it with a
  hardcoded palette. The callout keeps the brand `highlight` border on both canvases.
- **No label gradient on the callout**: `Button asChild` paints no label gradient, the link text inherits the banner's
  colour (`text-white` on Thread, the default text colour otherwise). A `text-gradient-focus` span would turn solid
  dark brand in the light theme, unreadable on the Thread canvas, which stays near-black in both themes.
- **The sidebar's collapsed button keeps `w-9 px-0`** and its icon its `text-filigran-brand-primary`: an SVG fill
  ignores the label's text gradient, so the icon looks as before inside the gradient border.
- **`servers/` goes**: its last export is this one; the aliases wait for 3708.

## To validate

- The four buttons trade the legacy 2px gradient border, glow and reversed-gradient hover for the design system's
  `secondary` gradient border and its tinted hover. Alternative: none without restyling `Button`.
- The Thread feature voting callout loses its lime to blue button and gets the brand `highlight` one. Alternative: a
  themed button outside the design system, for an event identity.
- The callout label loses its gradient text (inherited text colour). Alternative: a `text-gradient-focus` span,
  unreadable in the light theme on the Thread canvas.
- In the light theme the `highlight` labels are solid brand colour instead of a gradient (the design system's
  contrast rule).

## Deferred findings

- The sidebar's "XTM Platform Trial" link and the XTM One access link wrap a `button` inside an `a` (interactive
  content nested in a link, kept unfocusable with `tabIndex={-1}`). `<Button asChild><Link/></Button>`, as the
  callout does, would give one element.
- The collapsed sidebar's trial link has no accessible name: its only content is an `aria-hidden` icon, and the
  `button` it holds is icon-only, where the design system asks for an `IconButton` with `aria-label`.
- `Button asChild` paints the gradient border but not the gradient label, so a `highlight` link button and a
  `highlight` button differ: an upstream report.
- On the Thread callout, whose canvas stays near-black in both themes, the light theme's `highlight` border starts at
  dark brand blue (`#0015a8`, about 1.6:1 on `#0A0A0A`) and its hover tint barely shows; the white label stays
  readable. Scoping the canvas to the design system's dark theme would fix it, outside this swap.
- `ReachSalesButton`'s `gradient` branch has no unit test (its only test caller stubs it), and the e2e
  `Reach out to Sales` locator runs on the `default` branch of the trial panel.
- No unit test renders the sidebar's trial link in the private sidebar or in its collapsed, icon-only form: only the
  expanded public sidebar finds it by text.
