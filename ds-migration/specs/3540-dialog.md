---
key: 3540-dialog
issue: 3540
epic: epic-2-composites
kind: ds # ds | candidate | adoption | cleanup
legacy_symbols: [Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger, AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogOverlay, AlertDialogPortal, AlertDialogTitle, AlertDialogTrigger]
target_module: "@filigran/design-system"
target_symbols: [Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogBody, DialogFooter, DialogClose]
legacy_files_to_delete: [apps/frontend/src/components/filigran-ui/components/clients/Dialog.tsx, apps/frontend/src/components/filigran-ui/components/clients/AlertDialog.tsx]
---

# Dialog → `@filigran/design-system`

## Intent

Every legacy `Dialog*` and `AlertDialog*` part moves to the design system `Dialog` compound, on the same Radix
primitive. Who opens each dialog, what each button does, what closes it, the dialog names, roles and button names stay
the same for users. The scrim, panel, title, description, footer and corner close icon take the design system look.

## Props mapping

Rules shared by every row:

- **Parts**: `Dialog`, `DialogTrigger`, `DialogContent`, `DialogTitle`, `DialogDescription`, `DialogFooter`,
  `DialogClose` keep their names from `@filigran/design-system`. `DialogHeader` goes: its title and description become
  direct children of `DialogContent`, and any other child of the header moves to the top of `DialogBody`.
- **Body**: what sits between the title block and the footer goes into one `DialogBody`, so it scrolls inside the
  viewport-bounded panel. When a `<form>` or `AutoForm` wraps the fields and the footer, the whole form goes into
  `DialogBody`, footer included. No `DialogBody` when there is nothing to put in it.
- **Size**: legacy width at or under 640px (default `max-w-lg`, `max-w-[32rem]`) → default `md`; wider (`max-w-3xl`,
  `max-w-5xl`, full screen) → `size="lg"`.
- **Restyling goes**: every `className` on `DialogContent`, `DialogHeader`, `DialogFooter` (`p-0`, `w-full`, `max-w-*`,
  `h-[80vh]`, `max-h-[90vh]`, `flex flex-col overflow-hidden`, `border-0 bg-elevation-background-layer-2`, `layer-2`,
  `gap-s`, `mb-s`, `justify-end`, `pt-s`), and the spacing class that separated a child from the legacy header
  (`AutoForm className="mt-s"`). Kept: `z-[110]` (stacking above the edit-mode overlay), `sr-only` and
  `whitespace-pre-line` on a description.
- **No viewport guard**: the design system's `w-overlay-*` widths already cap at `calc(100vw - 2rem)`.
- **Former `AlertDialog`**: `AlertDialog` → `Dialog`; `AlertDialogContent` → `DialogContent role="alertdialog"
  onInteractOutside={(e) => e.preventDefault()}` (the Radix `AlertDialog` defaults), plus `hideCloseButton` when the
  footer holds a Cancel; `AlertDialogCancel` → `<DialogClose asChild><Button priority="secondary">`;
  `AlertDialogAction className={buttonVariants({ variant })}` → `<DialogClose asChild><Button variant={…}>`, same
  `onClick` (a `preventDefault` in it still keeps the dialog open); `AlertDialogTitle`/`Description`/`Trigger` →
  `DialogTitle`/`DialogDescription`/`DialogTrigger`.
- Former `Dialog` call sites keep the corner close icon, as the legacy did.

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| `AlertDialogComponent` (`ui/AlertDialog.tsx`): optional trigger, header with an `sr-only` empty description, children, Cancel + Action footer | Former `AlertDialog` rules; `DialogDescription` only when `description` is set, otherwise `aria-describedby={undefined}` on `DialogContent` (the Radix opt-out that the empty description stood for); children in `DialogBody`; `hideCloseButton={displayCancelButton}`; props unchanged | 1 wrapper, every caller unchanged (`SheetWithPreventingDialog` included) |
| `DialogInformative` (`ui/Dialog.tsx`): header `gap-s`, description `whitespace-pre-line`, children, optional footer with one `DialogClose` button | `DialogTitle`, `DialogDescription className="whitespace-pre-line"`, `DialogBody` only when children are given, `DialogFooter` without class; props unchanged | 1 wrapper, 3 callers unchanged (`DeleteUser`, `ReachSalesButton`, `ConnectProductFromHubModal`) |
| Form dialog, footer outside the form (`ServiceSlugAddCapabilities`, `SubscriptionSlugAddCapabilities`, `ReachSalesDialogForm`) | Title, `DialogBody` (description paragraph, list or `<form id>`), `DialogFooter` | 3 |
| Form dialog, footer inside `<form>`/`AutoForm` (`ContentEditDialog` `z-[110]`, `LibraryUpdateMetadata` `max-w-3xl`, `IntegrationsCsvExportDialog`, `PrivateXtmPlatformTrialBanner`, `BundleCancelSheet` `max-w-[32rem]`) | Title (+ description), `DialogBody` > form > fields + `DialogFooter`; `ContentEditDialog` keeps `z-[110]` and its draft hint `<p>` opens the body; `LibraryUpdateMetadata` `lg` | 5 |
| `TrialUserDialog` `max-w-3xl`, title + child form component | `size="lg"`, `DialogTitle`, `DialogBody` > form | 1 |
| Detail dialogs `EpicItem`, `FeatureVotingItem`: `DialogContent className="p-0 max-w-5xl h-[80vh] …"` > detail component | `size="lg"`; `EpicItemDetailed` and `FeatureVoteDetail` roots drop `p-l bg-elevation-background-layer-1` (the panel now pads and paints) and keep their inner scroll area; the `EpicItemDetailed` `h2` gets `pr-8` so a long title clears the corner close icon | 2 (+2 detail roots) |
| `CookieConsentPreferences`: `className="border-0 bg-…"`, title, description, sections, Save footer | Default `md`; sections in `DialogBody`, inside a `flex flex-col gap-4` wrapper that keeps the space the legacy panel gap gave them | 1 |
| `ShareableResourceCarouselView`: full-screen `DialogContent` holding a `Carousel` of `fill` images | `size="lg"`; the inner `Carousel` gets `className="h-[80vh]"` so the `fill` images keep a height | 1 |
| `FileInputWithPrevent`, `DraftsConfirmDialog` (`z-[110]`): `AlertDialog` with trigger or Action + Cancel | Former `AlertDialog` rules, `hideCloseButton`, `z-[110]` kept | 2 |
| `ExitEditModeDialog` (`z-[110]`): `AlertDialog`, three action buttons, no Cancel | Former `AlertDialog` rules; the corner close icon shows, since no footer button dismisses without exiting | 1 |
| `OneClickDeploy` `AlertDialogContent className="max-w-3xl w-full"`; `OnePlatformDisplay` `AlertDialogTitle` | `size="lg"`, former `AlertDialog` rules, `hideCloseButton` (both contents end with Cancel); `DialogTitle` | 2 |
| Legacy `CommandDialog` (unused) imports `./Dialog` | `Dialog`, `DialogContent` from `@filigran/design-system`, without `className` | 1 |

## Files in scope

- `apps/frontend/src/components/ui/AlertDialog.tsx`, `ui/Dialog.tsx`, `ui/FileInputWithPrevent.tsx`, and a new
  `ui/AlertDialog.test.tsx`: `alertdialog` named by its title, Cancel closes, the action calls `onClickContinue`, a
  `preventDefault` in it keeps the dialog open, an outside click keeps it open, no corner close icon while Cancel
  shows, a `description` becomes the accessible description and its absence leaves no `aria-describedby`.
- `content-translation/ExitEditModeDialog.test.tsx`: the corner Close closes the dialog without leaving edit mode.
- `service/[slug]/ServiceSlugAddCapabilities.tsx`, `subcription/[slug]/SubscriptionSlugAddCapabilities.tsx`,
  `service/trial-instances/reach-sales/ReachSalesDialogForm.tsx`, `content-translation/ContentEditDialog.tsx`,
  `DraftsConfirmDialog.tsx`, `ExitEditModeDialog.tsx`, `service/document/ui/LibraryUpdateMetadata.tsx`,
  `ShareableResourceCarouselView.tsx`, `service/components/header/IntegrationsCsvExportDialog.tsx`,
  `service/trial-instances/banner/xtm-platform-trial/PrivateXtmPlatformTrialBanner.tsx`,
  `service/trial-instances/xtm-platform-trial/shared/BundleCancelSheet.tsx`, `…/manage-trial/TrialUserDialog.tsx`,
  `cookie-consent/CookieConsentPreferences.tsx`, `epic/epic-item/EpicItem.tsx`, `EpicItemDetailed.tsx`,
  `feature-voting/FeatureVotingItem.tsx`, `FeatureVoteDetail.tsx`,
  `service/document/one-click-deploy/OneClickDeploy.tsx`, `OnePlatformDisplay.tsx` (all under `apps/frontend/src/components/`)
- `filigran-ui/components/clients/Command.tsx`, `clients/index.ts` (drop both exports), `clients/Dialog.tsx` and
  `clients/AlertDialog.tsx` (delete)
- No e2e locator changes: `getByRole('alertdialog')` (user, profile, integration models) holds through
  `role="alertdialog"`; `body > [role="dialog"]` holds (Radix still portals to `body`); Escape still closes.
- Unit tests stay as they are: `findByRole('alertdialog')`, `getByRole('dialog', { name })` and the corner
  `button` "Close" (the design system's fixed `aria-label`) keep matching.

## Screens

```json
[
  {
    "name": "admin-user-delete-confirm",
    "path": "/app/admin/user",
    "steps": [
      { "click": "tr:has-text(\"Arya.Stark\") >> role=button[name=\"Open menu\"s]" },
      { "click": "role=menuitem[name=\"Delete\"]" },
      { "waitFor": "role=alertdialog" }
    ]
  },
  {
    "name": "cookie-preferences",
    "path": "/app",
    "steps": [
      { "click": "role=region[name=\"Cookie settings\"] >> role=button[name=\"Cookie settings\"]" },
      { "waitFor": "role=dialog[name=\"Cookie settings\"]" }
    ]
  }
]
```

## Out of scope

- The legacy `Sheet` (3699) and `SheetWithPreventingDialog`, `Form`/`AutoForm` (3706, 3707), `Carousel` (3703),
  `Command` beyond its import (3700), `Separator`, `Skeleton`, `toast`, and the `Button` classes in footers.
- `@radix-ui/react-alert-dialog` in `package.json` and the legacy `theme.css` (cleanup 3708).

## Accessibility and i18n

- Kept: `role="alertdialog"` on every former `AlertDialog`, `role="dialog"` elsewhere, `aria-modal`, names from
  `DialogTitle`, descriptions (`sr-only` ones too), the corner close `button` "Close", Escape to close.
- No translation key added or removed. The corner close label is the design system's fixed English "Close", as the
  legacy default was.

## Verification

- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test src/components/ui src/components/admin src/components/content-translation src/components/cookie-consent src/components/epic src/components/feature-voting src/components/service src/components/subcription src/components/registration src/components/profile src/components/organization src/components/competitor src/components/trials src/components/me src/components/menu src/components/filigran-ui`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `node ds-migration/validate.mjs ds-migration/specs/3540-dialog.md`

## Decisions

- **`AlertDialog` is migrated here**: the contract maps it to `Dialog` primitives ("No `AlertDialog` in v1: compose
  confirm/cancel dialogs from these primitives") and no other item covers it, while cleanup 3708 removes the folder.
- **Former alert dialogs keep `role="alertdialog"` and ignore outside clicks**: Radix `AlertDialog` is this same
  composition; unit tests and three e2e page models find them by that role.
- **`hideCloseButton` only where a Cancel sits in the footer** (contract usage rule); former `Dialog` call sites keep
  the corner icon they always had, `DialogInformative` included. Former alert dialogs without a Cancel gain it.
- **One width rule** for every call site: `md` up to the legacy 512px, `lg` above.
- **Detail roots lose their own padding and surface**, as `ConnectedProductItem` did in the Menu item: they filled a
  `p-0` panel, the design system panel now pads.
- **Two screens**: the delete confirmation covers the former `AlertDialog` path, cookie preferences the former
  `Dialog` path (title, description, body, footer, corner icon). The form dialogs sit behind a service instance id
  or, on public pages, behind a signed-out session in the capture.
- **`ChoosePlatformForm` submits from Continue** (epic review): the `Button` migration left Continue without a
  `type`, and the design system `Button` defaults to `type="button"`, so the multi-platform deploy never ran. Continue
  is `type="submit"` and the dialog closes from `onSubmit`, as `OnePlatformDisplay` does, so the form is still mounted
  when it submits and an empty choice keeps the dialog open on its message.
- **`ConfirmDialog` is the one confirmation** (epic review): `src/components/ui/ConfirmDialog.tsx` holds the former
  `AlertDialog` composition (`role="alertdialog"`, outside clicks ignored, Cancel in `DialogClose` or, with
  `hideCancelButton`, the corner close icon, a confirm button that closes unless its handler prevents it).
  `AlertDialogComponent` and `DraftsConfirmDialog` go, their thirty-odd callers and `FileInputWithPrevent` use it.
  `ExitEditModeDialog` (three async actions, no Cancel) and the one-click deploy dialog (its own form) stay composed.

## To validate

- [x] Panels widen from 512 to 640px (`md`), and the 768px ones to 960px (`lg`); confirmations included. Alternative:
  `sm` (420px) for confirmations, as the contract's delete example, and `md` for the 768px forms.
- [x] Former alert dialogs keep ignoring backdrop clicks, against the design system default (backdrop closes).
  Alternative: the default.
- [x] The resource image viewer goes from full screen to a 960px panel with an 80vh carousel. Alternative: a full-screen
  viewer, which the design system excludes (a candidate component).
- [x] Epic and feature detail dialogs lose their fixed 80vh height and size to their content, up to the viewport.
- [x] Title and description are 24px apart (the panel gap) instead of 6–8px. Alternative: none without restyling.
- [x] Former alert dialogs without a Cancel (`ExitEditModeDialog`, `ConfirmDialog` with
  `hideCancelButton` in `UserEventSubscription` and `PendingUserAlreadyProcessedDialog`) gain the corner
  close icon the legacy `AlertDialog` never had. Alternative: `hideCloseButton` everywhere they were alert dialogs,
  against the contract rule.
- [x] Where the footer sits inside a `<form>`, it moves into `DialogBody` and scrolls with long forms (SEO metadata, CSV
  export) instead of staying fixed. Alternative: a `<form id>` in the body and `type="submit" form=<id>` buttons in a
  fixed `DialogFooter`, as `ReachSalesDialogForm` does.

## Deferred findings

- Design system: the corner close `aria-label` is a hard-coded English "Close" with no prop to translate it;
  `DialogBody` is `overflow-y-auto` with no inner padding, so the outset focus rings of full-width fields and of
  edge controls are clipped; the panel is capped at `100vh`, which a mobile browser's toolbars can cover. To raise
  upstream. The corner close icon also comes first in the DOM, so every dialog that shows it opens with focus on it
  (the legacy `Dialog` rendered it last, so focus went to the first field), and Enter right after opening dismisses.
  To raise upstream.
- Former alert dialogs no longer focus Cancel on open (the Radix `AlertDialog` default): focus goes to the first
  tabbable element, which is still Cancel in text-only confirmations, but a form field in `ChoosePlatformForm`.
- `ShareableResourceCarouselView`: the `fill` images have no `sizes`, so Next.js still picks a full-viewport source
  for a 960px panel.
- `FileInputWithPrevent` has no unit test for its confirmation.
- `ExitEditModeDialog`: the corner close icon stays active while an exit is running, and the running exit still leaves
  edit mode after it closes, as Escape already did.
- Design system: the missing-title `console.warn` only walks `children` props, so it fires for titles rendered by a
  child component (`FeatureVoteDetail`, `OnePlatformDisplay`).
- No accessible name: `ShareableResourceCarouselView` has no `DialogTitle`, `EpicItemDetailed` uses an `h2`,
  `ChoosePlatformForm` an `h1`.
- `ServiceSlugAddCapabilities` and `SubscriptionSlugAddCapabilities` render their description as a `<p>` rather than
  `DialogDescription`; `CommandDialog` is unused, and its props type still accepts the Radix `modal` the design system
  `Dialog` omits.
