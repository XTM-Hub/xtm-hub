---
key: 3688-alert
issue: 3688
epic: epic-2-composites
kind: ds # ds | candidate | adoption | cleanup
legacy_symbols: [Callout, calloutVariants]
target_module: "@filigran/design-system"
target_symbols: [Alert]
legacy_files_to_delete: [apps/frontend/src/components/filigran-ui/components/servers/Callout.tsx]
---

# Callout → `Alert` from `@filigran/design-system`

## Intent

The legacy `Callout` (3 call sites, all page-wide banners at the top of the shell) moves to the design system `Alert`.
Each banner keeps its message, its link, its days-left chip, its close button and its show/hide conditions. The
surface, the severity rule and glyph, the radius, the typography and the left alignment take the design system look.

## Props mapping

Rules shared by every row:

- **Import** `Alert` from `@filigran/design-system`. Nothing else of `@filigran/ui` is involved.
- **The message goes in `title`** (contract RULE-02). No call site has a second line, so no `description`.
- **No `elevation`**: every host is the default page background (`AppShell` root, login `main`), so the default 2
  applies (contract surface rule).
- **The legacy look classes go**: `rounded-none`, `justify-center`, `uppercase` and the trial gradient
  (`from-blue to-turquoise-300 bg-linear-to-r`), with `relative` and `pr-xxl` that only made room for the absolutely
  positioned close button. `Alert` gets no `className`.

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| `AdminBanner`: `<Callout variant="warning" className="rounded-none justify-center uppercase">{t('AdminBanner')}</Callout>` | `<Alert severity="warning" title={t('AdminBanner')} />` | 1 |
| `TestEnvBanner`: `<Callout variant="destructive" className="rounded-none justify-center uppercase"><div className="">{text}<Link className="ml-xs underline">…</Link></div></Callout>` | `<Alert severity="warning" title={<>{text}<Link href="https://hub.filigran.io/" className="ml-xs underline">{t('GoToProd')}</Link></>} />`: the empty-class `div` goes (the title is a `p`), the link stays inline after the text with its classes | 1 |
| `XtmPlatformTrialBanner`: `<Callout className="relative rounded-none justify-center from-blue to-turquoise-300 bg-linear-to-r pr-xxl">` holding the text, `LearnMoreBannerLink`, the days-left `Chip` in `<span className="light">`, and an absolutely positioned close `<button>` | `<Alert severity="info" title={text} action={<>…</>} />`: `action` holds, in the legacy order and under the same conditions, `LearnMoreBannerLink`, the `Chip` without its `span.light` wrapper, and the same `<button type="button" aria-label={t('Utils.Close')} onClick={dismiss}>` with `CloseIcon`, whose `absolute inset-y-0 right-l` go (it keeps `flex items-center`) | 1 |

The `.light` wrapper existed only because the gradient behind the chip was light in both themes; on the `Alert`
surface it would paint a light chip on the dark banner, and the contract says nested theme panels do not work on it.
Its code comment goes with it.

## Files in scope

- `apps/frontend/src/components/admin/AdminBanner.tsx`
- `apps/frontend/src/components/admin/TestEnvBanner.tsx`
- `apps/frontend/src/components/service/trial-instances/banner/xtm-platform-trial/XtmPlatformTrialBanner.tsx`
- `apps/frontend/src/components/filigran-ui/components/servers/index.ts` (drop `export * from './Callout'`)
- `apps/frontend/src/components/filigran-ui/components/servers/Callout.tsx` (delete)
- No unit test change: `XtmPlatformTrialBanner.test.tsx`, `PublicXtmPlatformTrialBanner.test.tsx` and
  `PrivateXtmPlatformTrialBanner.test.tsx` find the copy by text and the close button by role and `Utils.Close`, all
  kept; `toBeEmptyDOMElement` still holds for `none` and after dismissal, since the component still returns `null`.
- No e2e locator: none in `apps/e2e/tests/` finds these banners, their copy or their close button.

## Screens

```json
[
  {
    "name": "admin-and-env-banners",
    "path": "/app/admin/user",
    "steps": [
      { "click": "role=button[name=\"Reject all\"]" },
      { "waitFor": "text=You are currently in admin mode." },
      { "waitFor": "text=Go to production" }
    ]
  },
  {
    "name": "public-trial-banner",
    "path": "/en/cybersecurity-solutions",
    "steps": [
      { "click": "role=button[name=\"Reject all\"]" },
      { "waitFor": "text=Start your 30-day free trial" },
      { "hover": "role=link[name=\"Learn more\"]" }
    ]
  }
]
```

## Out of scope

- `LearnMoreBannerLink`'s classes (`text-inherit border-current hover:bg-current/10`, tuned for the gradient), the raw
  close `<button>`, `EditionModeBanner`'s hand-rolled primary banner and `AppShell`'s banner stacking (Deferred
  findings).
- The `TestEnvBanner` copy and its hardcoded production URL.
- The legacy `theme.css` (cleanup 3708).

## Accessibility and i18n

- Each banner root becomes a live region (component behaviour): `role="alert"` for `AdminBanner` and `TestEnvBanner`
  (warning), `role="status"` for the trial banner (info). Rendered with the page they are read in document order;
  `AdminBanner` mounts on client navigation into the admin area, so it is now announced there.
- The severity glyph is `aria-hidden`; every message states its condition on its own (contract RULE-04).
- The close button keeps its `aria-label={t('Utils.Close')}`, the `Go to production` and `Learn more` links their
  names. The admin and environment messages lose the CSS `uppercase`; their accessible text is unchanged.
- No translation key added or removed.

## Verification

- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test src/components/admin src/components/service/trial-instances src/components/filigran-ui`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `node ds-migration/validate.mjs ds-migration/specs/3688-alert.md`

## Decisions

- **`Alert`, not `Snackbar`, for all three**: they stay in the page flow until a condition changes or the user
  dismisses them for good (localStorage); `Snackbar` is transient, floats in a portal and auto-retires (Snackbar
  RULE-09: "If it stays on the page, it is an Alert"). Its provider is also item 3690, not a dependency here.
- **`TestEnvBanner` is `warning`, not `error`**: being on a non-production environment is a condition to heed, not a
  failure (contract RULE-03: never pick a severity for its colour). The legacy `destructive` was a colour choice.
- **The trial banner is `info`**: an invitation, no condition to heed; `ia` is the AI mark only.
- **The dismissible trial invitation is a persistent `Snackbar`** (epic review, settling the alternative this item
  traced once 3690 landed): Alert RULE-05, "if it can be dismissed, it is a Snackbar". In the `no-trial` and `active`
  states it is a `Snackbar` with `duration={Infinity}`, the design system close control (`Utils.Close`) and
  `onOpenChange` as the single dismiss path (close, swipe, Escape, the action), kept mounted with `open={!dismissed}`.
  It floats top-right instead of pushing the page, and its card slides in after hydration. The learn-more link is its
  `action` (`Button asChild priority="secondary" size="sm"`, without the gradient restyle), so following it also
  dismisses the invitation; the days-left chip is its `description`. `AppSnackbars` now wraps the app so the banner
  sits under its provider.
- **The `ending` state stays an `Alert` with no close control** (epic review): it cannot be dismissed, and Snackbar
  RULE-09 says a message that stays on the page is an Alert. The days-left chip stays in its `action`.

## To validate

- The trial banner loses its blue-to-turquoise brand gradient for the `info` surface. Alternative: none without
  restyling the `Alert`; a promotional banner surface would be a design system request.
- `TestEnvBanner` goes from red to the `warning` severity, the same as `AdminBanner`, so the two stacked banners on an
  admin page of a non-production environment look alike and differ by text only. Alternative: `error`, which keeps
  the red cue but states a failure that is not one.
- The admin and environment messages lose their uppercase and centring: left-aligned `title-xs` after the glyph.
  Alternative: none without restyling.
- The banners go from flush, square, edge-to-edge strips to `Alert`'s rounded surface with an 8px inset, stacked with
  no gap between them. Alternative: a gap or an inset in `AppShell`'s banner area (layout around the component).

## Deferred findings

- `AdminBanner` and `TestEnvBanner` are persistent `warning` alerts, so `role="alert"`, and both can mount after
  hydration (client navigation into the admin area, the login page once its settings load): a screen reader may
  interrupt with them. The contract allows a `role="status"` override, a design decision for a later epic.
- `AdminBanner` and `TestEnvBanner` have no unit test: their show/hide conditions and the production link are
  uncovered.
- `EditionModeBanner` hand-rolls a primary-coloured banner with restyled `Button`s next to these: an `Alert` adoption
  candidate for phase 2 (#3709).
- `TestEnvBanner` hardcodes `https://hub.filigran.io/`; the production URL is configuration.
