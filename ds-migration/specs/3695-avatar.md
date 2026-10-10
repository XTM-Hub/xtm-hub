---
key: 3695-avatar
issue: 3695
epic: epic-3-candidates
kind: candidate # ds | candidate | adoption | cleanup
legacy_symbols: [Avatar, AvatarContainer, AvatarImage, AvatarFallback]
target_module: "@/components/ui/avatar"
target_symbols: [Avatar]
legacy_files_to_delete: [apps/frontend/src/components/filigran-ui/components/clients/Avatar.tsx]
---

# Avatar → `@/components/ui/avatar`, rebuilt on `Icon` and design system tokens

## Intent

The design system ships no `Avatar`: `Thumbnail` is a fixed 48px rounded `Paper` frame, and its contract leaves "an
avatar" out of scope. The legacy Radix `Avatar` (3 call sites: the header user menu, the profile picture card and
`UserDisplay`) is rebuilt as a candidate in `src/components/ui/avatar/`, without Radix, on the design system `Icon`
and tokens. Every avatar keeps its size, its round crop, the user's picture when it loads and a person glyph
otherwise.

## The component

`src/components/ui/avatar/`, the package layout:

- `Avatar.tsx` (`'use client'`, it holds state): `Avatar`, a `span` root, valid inside the header's button, classes merged with the app's `cn` (`@/lib/utils`), `className` last:
  `relative flex size-full shrink-0 items-center justify-center overflow-hidden rounded-full` (`flex`, as the legacy
  root: an `inline-flex` root would sit on a text line and add descender space under it). Props: the native `span`
  attributes without `children` and `dangerouslySetInnerHTML` (the root always has children), `className`,
  `src?: string` and `alt?: string` (default `''`). It forwards its ref to the `span` and sets `displayName = 'Avatar'`.
  - Loading, as the Radix primitive did: a layout effect preloads `src` with `new window.Image()` and the `img`
    (`size-full object-cover`, `src`, `alt`) renders only once it loaded. While it loads, when it fails and when `src`
    is empty or missing, the fallback renders instead: a `span` (`flex size-full items-center justify-center
    bg-elevation-highlight text-icon-default`) holding `<Icon name="user" size={24} />`. Without `alt` (or with
    `alt=""`) the glyph is decorative (`aria-hidden`); with a non-empty `alt` the fallback `span` takes `role="img"` and
    `aria-label={alt}`, so a named avatar keeps its name while it loads or after it fails.
  - Right after setting the preload's `src`, a picture the browser already has (`complete && naturalWidth > 0`) is
    marked loaded synchronously in the layout effect, before paint, so a cached picture never flashes the glyph (Radix
    did the same), under a short why comment (`react-hooks/set-state-in-effect` does not flag a layout effect, so no
    disable directive). That branch then clears the preload's handlers, so the `load` event the browser still fires
    does not render the avatar a second time. Otherwise the `onload` and `onerror` handlers set state asynchronously.
  - The `<img>` keeps its `@next/next/no-img-element` disable, with a why comment that names no caller: pictures come
    from any identity provider host, and the component preloads them itself.
  - The status is stored with the `src` it belongs to and derived against the current `src`; the effect clears the
    preload's handlers on cleanup so a stale `src` never wins.
- `Avatar.meta.ts`: `AvatarMeta`, typed `ComponentMeta` from `@filigran/design-system/meta` (type import only): name,
  description, `status: 'beta'`, `category: 'data-display'`, `version: '0.1.0'`, `radixPrimitive: 'none'`, variants
  `image` and `fallback`, no size, two examples (`<Avatar src={user.picture} className="size-8" />`,
  `<Avatar className="size-6" />`), `props`, and `accessibility` with `wcagStatus: 'pending'`, the contrast pair
  `--icon-default` on `--bg-elevation-highlight` at 3, and notes: decorative by default (`alt=""`, the glyph
  `aria-hidden`), the caller names the person next to it; pass `alt` only for a standalone avatar, which names the
  image and, while it loads or after it fails, the fallback. The description names the `user` glyph.
- `Avatar.test.tsx`: the fallback glyph shows without `src`, with `src=""` and while the image loads (jsdom never
  loads one), as one `it.each` in array form; with a stubbed `window.Image` (`vi.stubGlobal`) that fires `onload`, the
  `img` shows with its `src`, `alt=""` and `object-cover`, and the fallback goes; one that fires `onerror` keeps the
  fallback; a stubbed image already `complete` with a `naturalWidth` shows the `img` on the first render, without
  waiting; a given `alt` reaches the `img`, and names the fallback (`getByRole('img', { name })`) while it loads; with
  a stub whose loads the test fires by hand: after a loaded `src`, a rerender with a `src` still loading shows the
  fallback at once (the status belongs to its `src`), and a late `load` of the previous `src` after the new one loaded
  keeps the new image (the cleanup); the root classes; a caller's `size-8` replaces `size-full`; native attributes
  pass through; the ref reaches the `span`. `size-full` is one constant shared by the root classes and the size test.
- `index.ts`: exports `Avatar` and the `AvatarProps` type, never the meta.

## Props mapping

Every call site imports `Avatar` from `@/components/ui/avatar` and drops it from its `@filigran/ui` import line (the
whole line when it was the only name). The wrapper `div` that sizes each avatar stays; only the classes that reached
into the legacy markup go.

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| `<div className="my-auto [&_img]:object-cover size-6 text-primary [&_span]:bg-transparent"><Avatar src={me?.picture \|\| undefined} /></div>`, `Avatar` from `@filigran/ui/clients` | `<div className="my-auto size-6"><Avatar src={me?.picture \|\| undefined} /></div>`; the other names of the import line stay | 1 (`Header.tsx`) |
| `<div className="size-24 cursor-pointer [&_img]:object-cover" onClick=…><Avatar src={preview \|\| me?.picture \|\| undefined} /></div>`, from `@filigran/ui` | `<div className="size-24 cursor-pointer" onClick=…>`, same `Avatar` | 1 (`profile/form/Picture.tsx`) |
| `<div className={cn('shrink-0 [&_img]:object-cover', pictureClassName)}><Avatar src={uploader?.picture ?? ''} /></div>`, from `@filigran/ui/clients` | `<div className={cn('shrink-0', pictureClassName)}>`, same `Avatar` | 1 (`ui/UserDisplay.tsx`, rendered by `ShareableResouceDetails`, `ShareableResourceCardFooterAuthor`, `LastDeployedResourceRow`) |
| `AvatarContainer`, `AvatarImage`, `AvatarFallback` | removed, no caller | 0 |

## Files in scope

- `apps/frontend/src/components/ui/avatar/Avatar.tsx`, `Avatar.meta.ts`, `Avatar.test.tsx`, `index.ts` (new)
- `apps/frontend/src/components/Header.tsx`
- `apps/frontend/src/components/profile/form/Picture.tsx`
- `apps/frontend/src/components/ui/UserDisplay.tsx`
- `apps/frontend/src/components/ui/UserDisplay.test.tsx`: the two avatar tests find the avatar with
  `getByRole('img', { hidden: true })`, which matched the legacy `IndividualIcon` (`role="img"`); the design system
  `Icon` renders a decorative glyph with no role. They render the real `Avatar` (no mock: the testing skill forbids
  mocking children components; jsdom never loads an image, so the avatar shows its glyph) and find the glyph with
  `container.querySelector('svg')`, keeping their names, Given/Then and the presence and absence checks.
- `apps/frontend/src/components/filigran-ui/components/clients/index.ts` (drop `export * from './Avatar'`)
- `apps/frontend/src/components/filigran-ui/components/clients/Avatar.tsx` (delete)

No e2e locator finds an avatar: the page models use the "Open menu user" button, the "Update picture" and edit
buttons and the snackbar text, all unchanged.

## Screens

The development data has no user picture: every screen shows the fallback glyph. `Avatar.test.tsx` covers the loaded
image. The profile screen clips to the 96px avatar wrapper, the resource screen to the details column where the
32px author avatar stands.

```json
[
  {
    "name": "header-user-menu",
    "path": "/app",
    "steps": [{ "click": "role=button[name=\"Reject all\"]" }, { "waitFor": "role=button[name=\"Open menu user\"]" }],
    "clip": "header"
  },
  {
    "name": "profile-picture",
    "path": "/app/profile",
    "steps": [{ "click": "role=button[name=\"Reject all\"]" }, { "waitFor": "role=button[name=\"Update picture\"]" }],
    "clip": "div.size-24.cursor-pointer"
  },
  {
    "name": "resource-author",
    "path": "/en/cybersecurity-solutions/opencti-custom-dashboards",
    "steps": [
      { "click": "role=button[name=\"Reject all\"]" },
      { "click": "li > a.flex-1[href]" },
      { "waitFor": "label:text-is(\"Author\")" }
    ],
    "clip": "section:has(label:text-is(\"Author\"))"
  }
]
```

## Out of scope

- `Thumbnail` and every other hand-rolled image frame.
- `UserDisplay` beyond its avatar wrapper, and the `IconActions` trigger around the header avatar.
- The profile picture `div` with an `onClick` and no role or keyboard access (Deferred findings).
- `@radix-ui/react-avatar` in `apps/frontend/package.json`: a shared file, removed with the copy (3708).
- `Accordion`, `Carousel`, `Sheet` and the other exports of `clients/`: their own items.

## Accessibility and i18n

- The avatar is decorative at every call site: the header avatar sits in the "Open menu user" button, `UserDisplay`
  prints the name beside it, the profile card is titled "Picture". The loaded `img` gets `alt=""` (the legacy had no
  `alt`, an unnamed image) and the glyph is `aria-hidden` (the legacy glyph had `role="img"` and no name). No accessible
  name changes.
- No translation key added or removed.

## Verification

- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test src/components/ui src/components/profile src/components/homepage src/components/service/document src/components/filigran-ui`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `node ds-migration/validate.mjs ds-migration/specs/3695-avatar.md`

## Decisions

- **A candidate, not `Thumbnail`**: `Thumbnail` is one 48px size with a `Paper` radius and border; the avatars are
  24, 32 and 96px circles, and its contract keeps avatars out of scope.
- **No Radix**: the design system does not depend on `@radix-ui/react-avatar`, and `Label` dropped Radix for the same
  reason. The preload-then-swap of `Avatar.Image` is kept, so a picture with transparency never shows the glyph
  through it and a failed one never shows a broken image.
- **`size-full`, sized by the caller**: every call site already sizes a wrapper `div`, so the avatar fills it as the
  legacy did; a caller can size it directly through `className` instead. No `size` prop, as `Skeleton`.
- **`object-cover` built in**: all three callers added it through `[&_img]:`; an avatar crops, it never stretches.
- **`user` at 24px**: the design system `user` glyph (Figma `person`) is a bare figure like the legacy
  `IndividualIcon`; `circle-user` (Figma `account_circle`) draws its own ring, a circle inside the disc. `Icon` has
  only 16, 20 and 24px sizes; 24 is the default and the header avatar's size.
- **`bg-elevation-highlight` behind the glyph**: the surface the design system uses for a filled spot inside a layer
  (the input fill), following the `layer-N` of the card or page under it, where the legacy used `bg-muted`.
- **The `UserDisplay` tests render the real avatar**: the testing skill forbids mocking children components, and the
  glyph jsdom shows is enough to check whether `UserDisplay` renders it; `Avatar.test.tsx` owns the image loading.

## To validate

- The header avatar gains the `bg-elevation-highlight` disc and the `text-icon-default` glyph; the legacy cleared its
  fill (`[&_span]:bg-transparent`) and coloured the glyph `text-primary`. The avatar's own glyph colour also wins over
  the `text-icon-highlight` tint the design system `IconButton` gives its icon there. Alternative: a transparent
  fallback variant that inherits the colour around it.
- The fallback glyph is the design system `user` instead of the `@filigran/icon` `IndividualIcon`.
- The 96px profile avatar shows a 24px glyph centred in its disc, where the legacy glyph scaled with the avatar (about
  60px). The design system `Icon` has no size above 24 and must not be resized by class. Alternative: a larger glyph
  size, a design system decision.
- `category: 'data-display'` in the meta. Alternative: `surface`, next to `Thumbnail`.

## Deferred findings

- The profile picture opens the file picker from a `div` with `onClick`: no role, no focus, no keyboard access. The
  "Edit" button beside it does the same and is accessible, so only pointer users get the shortcut.
- The header passes a `div` wrapper as the `IconActions` icon, rendered inside a `button`: a `div` in a `button` is
  invalid HTML. It predates this change; the wrapper stays as the swap requires.
- `@radix-ui/react-avatar` has no import left in `apps/frontend` after this change; it stays declared in
  `package.json` until 3708.
