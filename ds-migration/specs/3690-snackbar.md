---
key: 3690-snackbar
issue: 3690
epic: epic-2-composites
kind: ds # ds | candidate | adoption | cleanup
legacy_symbols: [Toast, ToastAction, ToastClose, ToastDescription, ToastLabel, ToastProvider, ToastTitle, ToastViewport, ToastActionElement, ToastProps, Toaster, toast, useToast, reducer]
target_module: "@filigran/design-system"
target_symbols: [Snackbar, SnackbarProvider, SnackbarViewport]
legacy_files_to_delete: [apps/frontend/src/components/filigran-ui/components/clients/Toast.tsx, apps/frontend/src/components/filigran-ui/components/clients/Toaster.tsx, apps/frontend/src/components/filigran-ui/components/clients/use-toast.ts]
---

# Toast, Toaster, use-toast → `Snackbar` from `@filigran/design-system`

## Intent

The legacy toast stack (the `Toaster` mounted once in `AppContext`, and the imperative `toast()` store behind it, called
151 times from 72 files) moves to the design system `SnackbarProvider`, `SnackbarViewport` and `Snackbar`. Every call
site keeps its message, its moment and its success or error meaning; the one-message-at-a-time behaviour, the 5s
auto-dismiss and the swipe stay. The card, its placement (top right), the glyphs and the close control take the design
system look.

## Props mapping

The design system ships no imperative API, so the host keeps a small store. It replaces `use-toast.ts` in
`apps/frontend/src/components/ui/snackbar/`:

- `snackbar-store.ts`: `showSnackbar(message)` with `message: Pick<SnackbarProps, 'severity' | 'title' | 'description'>`,
  `severity` required (contract RULE-03), and the hook the renderer reads (`useSyncExternalStore`, a stable snapshot,
  an empty server snapshot). Raising a message closes every open one (`open: false`, legacy `TOAST_LIMIT = 1`) and
  prunes the ones already closed (RULE-05: flip `open`, prune on the next raise, no timer). `onOpenChange(false)` marks
  the message closed, never removes it. No `dismiss`, `update`, `label` or `action`: no call site uses them.
- `AppSnackbars.tsx`: `<SnackbarProvider>` (no `duration`: Radix's 5000ms default, as the legacy), one
  `<Snackbar key severity title description open onOpenChange closeLabel={t('Utils.Close')} />` per stored message,
  then `<SnackbarViewport className="z-[100] w-[calc(var(--spacing)*100)]" />` (see Decisions).

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| `AppContext`: `import { Toaster } from '@filigran/ui'` and `<Toaster />` | `<AppSnackbars />`, same place | 1 |
| `toast(…)` imported from `@filigran/ui` or `@filigran/ui/clients` | `showSnackbar(…)` imported from `@/components/ui/snackbar/snackbar-store` | 62 + 10 files |
| `const { toast } = useToast()` then `toast(…)` | the import above; the destructuring line goes, and `toast` leaves the deps arrays of `LoginLayout`, `PendingUserRedirectErrorToast` and `use-pending-user-actions` (a module function is not a dependency) | 18 files |
| `toast({ title, description? })`, no variant | `showSnackbar({ severity: 'success', title, description? })` | 71 |
| `toast({ variant: 'destructive', title, description? })` | `showSnackbar({ severity: 'error', title, description? })` | 78 |
| `ShareLinkButton.tsx:93` `toast({ description: t('Service.ShareableResources.Copied') })` | `showSnackbar({ severity: 'success', title: t('Service.ShareableResources.Copied') })` (RULE-01: a one-line message is a title) | 1 |
| `ShareLinkButton.tsx:98` `toast({ title: t('Utils.FailedToCopy'), description: error.message })`, no variant | `showSnackbar({ severity: 'error', title: t('Utils.FailedToCopy'), description: error.message })` | 1 |

Title and description values move unchanged, `<>{t(…)}</>` fragments included.

## Files in scope

- `apps/frontend/src/components/ui/snackbar/snackbar-store.ts`, `snackbar-store.test.ts`, `AppSnackbars.tsx`,
  `AppSnackbars.test.tsx` (new)
- `apps/frontend/src/components/ui/share-link/ShareLinkButton.test.tsx`: pins the copy message as a success title and
  the copy failure as `error`
- `apps/frontend/src/components/AppContext.tsx`
- The 72 files that import `toast` or `useToast` from `@filigran/ui` or `@filigran/ui/clients` (Grep
  `import .*\b(toast|useToast)\b.* from '@filigran/ui`); the other symbols of those imports stay on `@filigran/ui`.
- The tests that mock or spy on the legacy `toast`/`useToast`: `PendingUserRedirectErrorToast.test.tsx`,
  `use-pending-user-actions.test.ts`, `DeleteUser.test.tsx`, `UserList.test.tsx`, `FeatureVoteButton.test.tsx`,
  `FeatureVotingList.test.tsx`, `ManageTrialHeader.test.tsx`, `ManageTrialTable.test.tsx`, `AddTrialUserForm.test.tsx`,
  `EditTrialUsersForm.test.tsx`, `BundleCancelSheet.test.tsx`, `DocumentList.test.tsx`, `Register.test.tsx`,
  `TrialCancelSheet.test.tsx`, `IntegrationsCsvExportDialog.test.tsx`. They mock `showSnackbar` from the new module
  instead, and their expected payloads follow the mapping: `variant: 'destructive'` becomes `severity: 'error'`, a
  payload without variant gains `severity: 'success'`. No assertion is dropped or loosened.
- `apps/frontend/src/components/filigran-ui/components/clients/index.ts` (drop the three exports)
- `Toast.tsx`, `Toaster.tsx`, `use-toast.ts` in `filigran-ui/components/clients/` (delete)
- `apps/e2e/tests/tests_files/service-pictures.spec.ts`, `apps/e2e/tests/model/service.pageModel.ts`: the spec raises
  two messages back to back (two mutations in `EditService`). The closing one stays in the DOM during its exit
  animation, before the open one. So both its assertions are scoped to the open snackbar: `data-state="open"` in the
  `Notifications (F8)` region, through `ServicePage.getOpenSnackbar()`.
- `profile.spec.ts` and `user.spec.ts` raise one message and keep their locators. `apps/e2e/tests/screenshot.css`
  hides `body > div[role='region'][aria-label='Notifications (F8)']`: the design system viewport is portalled to
  `body` with Radix's same default label, so it still matches.

## Screens

```json
[
  {
    "name": "success-with-description",
    "path": "/app/profile",
    "steps": [
      { "click": "role=button[name=\"Reject all\"]" },
      { "click": "role=button[name=\"Reset password\"]" },
      { "waitFor": "text=Reset password email successfully sent." },
      { "hover": "text=Reset password email successfully sent." }
    ]
  },
  {
    "name": "success-title-only",
    "path": "/app/profile",
    "steps": [
      { "click": "role=button[name=\"Reject all\"]" },
      { "click": "role=button[name=\"Update profile\"]" },
      { "waitFor": "text=\"Success\"" },
      { "hover": "text=\"Success\"" }
    ]
  }
]
```

## Out of scope

- `@radix-ui/react-toast` in `package.json` and the legacy `theme.css` (cleanup 3708).
- The copy: `Utils.Success` used as both title and description in `EpicFormSheet`, the raw `error.message` in
  `ShareLinkButton`, the `PendingUserRedirectErrorToast` component name.
- Stacking several messages, an `action` slot, a per-message `duration`.

## Accessibility and i18n

- The close control gains an accessible name, `t('Utils.Close')` (existing key, contract RULE-06); the legacy one had
  none.
- Announcement follows the severity (component behaviour): `error` is assertive, `success` polite, where every legacy
  toast was assertive (Radix `foreground` default).
- F8 still focuses the messages; the viewport keeps the `Notifications (F8)` landmark name.
- No translation key added or removed.

## Verification

- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test src/components src/hooks`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `node ds-migration/validate.mjs ds-migration/specs/3690-snackbar.md`

## Decisions

- **A host store, not a port of `use-toast.ts`**: the contract says to delete the wrapper, and placement, timer and
  dismissal now ship; what does not ship is raising a message from a mutation callback outside React
  (`use-document-context.ts`, `use-feature-vote.tsx`). The store keeps only that.
- **`severity` is required at every call site**, no default: the design system makes it required so a mislabelled
  message cannot ship (MUI's `Alert` default is cited). So `ShareLinkButton`'s copy failure, painted green by the
  legacy default, becomes `error`.
- **`destructive` → `error`**: every one of the 78 is a failure (`Utils.Error` or an `Error.*` key).
- **One message at a time is kept**, closing the previous one so it slides out (RULE-05) instead of vanishing.
- **No width on the viewport** (epic review): the legacy `theme.css` no longer declares the numeric spacing steps
  (3558), so the design system's own `w-100` gives the 400px it intends.
- **`z-[100]` on the viewport**: the viewport is portalled to `body` at mount, before any `Sheet` or `Dialog`, all at
  `z-50` (`--fds-z-overlay` is undefined in the app), so a later overlay paints over it: the error raised by a failed
  sheet submission would land under the right-hand sheet. 100 is the legacy viewport's layer. Placement and layering
  belong on the viewport (RULE-07).
- **`@filigran/design-system/styles/motion.css` imported by `AppSnackbars.tsx`**: the enter, exit and swipe keyframes of
  `fds-snackbar-motion` ship only there and in `dist/index.css`, which the app does not load (it composes
  `tokens/theme.css` itself). Without them Radix unmounts the card at once and the swipe does not track the finger.
  `globals.css` is a shared file only the cleanup item touches, so the component loads it; move it there in 3708.
- **The store order sets no slot** (epic review): Radix portals each card into the viewport's `<ol>` in mount order,
  so the new card mounts below the closing one and moves up once it is gone, whatever the store order. The comment in
  `snackbar-store.ts` says only what the store does.

## To validate

- [x] Placement moves from top-centre to the design system's top-right, where right-hand sheets open: a message raised from
  a sheet sits over its header. Alternative: a top-centre `className` on the viewport.
- [x] One message at a time is kept from the legacy; the design system stacks them. Alternative: let them stack.
- [x] `ShareLinkButton`'s copy failure becomes red (`error`); the legacy showed it with the success styling. The branch only
  runs when the copy throws (see Deferred findings).

## Deferred findings

- `EpicFormSheet` repeats `Utils.Success` as title and description; many success messages are a bare `Utils.Success`
  title that says nothing of what succeeded.
- `ShareLinkButton` shows a raw, untranslated `error.message`.
- `@radix-ui/react-toast` stays a direct dependency of the app only through the design system: drop it in 3708.
- `ShareLinkButton`'s error branch never runs: `usehooks-ts`'s `useCopyToClipboard` returns `false` on failure instead
  of throwing, so a failed copy still shows "Copied" and counts a share (as with the legacy toast). Check the returned
  boolean.
- The content translation dialogs (`ContentEditDialog`, `DraftsConfirmDialog`, `ExitEditModeDialog`) sit at `z-[110]`,
  above the snackbar viewport's `z-[100]` (the legacy layer too): an error they raise can paint under them on a narrow
  window.
- Move the `motion.css` import from `AppSnackbars.tsx` to `globals.css` with the theme cleanup (3708).
- Upstream: the design system consumer skill lists only `gradient-helpers.css` as the sidecar for Tailwind hosts and
  omits `styles/motion.css`, which `Snackbar` needs to animate.
- `ServicePage.getOpenSnackbar()` finds the region by role, so it resolves only once a modal sheet closes (Radix
  `hideOthers` puts `aria-hidden` on the viewport). An error raised from a sheet that stays open shows up as "not
  found" rather than as its text. It is also app-wide and belongs in `tests/model/common.ts` once a second spec needs it.
- `service-pictures.spec.ts` checks only the message left open: a failure of the first of the two uploads, followed by
  a success, still passes (as with the legacy toast).
