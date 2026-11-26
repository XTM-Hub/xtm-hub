---
key: 3694-aspect-ratio
issue: 3694
epic: epic-2-composites
kind: ds # ds | candidate | adoption | cleanup
legacy_symbols: [AspectRatio]
target_module: "tailwindcss"
target_symbols: []
legacy_files_to_delete: [apps/frontend/src/components/filigran-ui/components/servers/AspectRatio.tsx]
---

# AspectRatio → Tailwind `aspect-video`

## Intent

The design system ships no `AspectRatio`: CSS `aspect-ratio` covers it. The one legacy usage, the 16:9 illustration
box of `ServiceInstanceCard`, becomes a plain `div` with Tailwind's `aspect-video`, and the legacy wrapper over
`@radix-ui/react-aspect-ratio` goes. The card keeps the same box, the same illustration crop and the same rounding.

## Props mapping

Radix renders two boxes: an outer `div` (`position: relative; width: 100%; padding-bottom: 56.25%`) and an inner
`div` (`position: absolute; inset: 0`) that receives `className` and the children. One `div` sized by `aspect-ratio`
does both jobs.

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| `<AspectRatio ratio={16 / 9} className={cn('rounded-t', fullBackgroundImage ? 'overflow-visible' : 'overflow-hidden')}>` | `<div className={cn('relative w-full min-h-0 aspect-video rounded-t', fullBackgroundImage ? 'overflow-visible' : 'overflow-hidden')}>`, same children | 1 (`ServiceInstanceCard.tsx:119`) |

- `relative`: the `next/image` `fill` child and the absolutely placed image and `h3` of the `fullBackgroundImage`
  branch position against this box, as they did against the Radix inner box.
- `w-full`: the parent is a `flex-col items-center` column; without it the box shrinks to its content, which is
  absolute, and collapses to zero width. Radix set `width: 100%` inline for the same reason.
- `min-h-0`: keeps the box at 16:9 when its content is taller, as the Radix box was (see Decisions).
- The `@filigran/ui/servers` import line goes; the other imports of the file stay.

## Files in scope

- `apps/frontend/src/components/service/ServiceInstanceCard.tsx`
- `apps/frontend/src/components/filigran-ui/components/servers/index.ts` (drop `export * from './AspectRatio'`)
- `apps/frontend/src/components/filigran-ui/components/servers/AspectRatio.tsx` (delete)

No test, wrapper in `src/components/ui/` or e2e locator refers to the box: `PublicServiceInstanceCard.test.tsx` checks
the title link only and keeps passing unchanged.

## Screens

```json
[
  {
    "name": "registration-service-cards",
    "path": "/app",
    "steps": [
      { "click": "a[href*=\"/service/opencti_registration/\"]" },
      { "waitFor": "text=Quick start guide" }
    ],
    "clip": "section:has(h2:text(\"Quick start guide\"))"
  }
]
```

## Out of scope

- `@radix-ui/react-aspect-ratio` in `apps/frontend/package.json`: a shared file, removed with the copy (3708).
- `GradientButton` and `Skeleton`, the other exports of `servers/` (3697, 3693).
- The rest of `ServiceInstanceCard`: the inline `textShadow`, the hardcoded `Illustration of …` alt, the legacy
  colour classes.

## Accessibility and i18n

The box carries no role, label or text of its own: nothing to keep or add. No translation key added or removed.

## Verification

- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test src/components/service`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `node ds-migration/validate.mjs ds-migration/specs/3694-aspect-ratio.md`

## Decisions

- **A Tailwind class, no component**: the issue asks for it, the design system has no `AspectRatio` and every
  supported browser has CSS `aspect-ratio`. A one-class box needs no candidate component.
- **`target_module: "tailwindcss"`, no target symbol**: nothing is imported in place of the legacy symbol.
- **One box instead of Radix's two**: the inner box was `inset: 0` inside the outer one, so both had the same size.
  CSS `aspect-ratio` lets a box grow past its ratio when its content is taller and `overflow` is visible (the
  `fullBackgroundImage` branch). That branch renders an uploaded illustration (`isCustomIllustrationDocument`) in
  normal flow, `unoptimized`, and preflight's `height: auto` gives it the file's own proportions: a square or
  portrait upload is taller than 16:9. Radix kept the box at its ratio and let the image overflow; `min-h-0` does
  the same.

## To validate

## Deferred findings

- The `fullBackgroundImage` branch of `ServiceInstanceCard` never renders: only
  `registeredPlatformToServiceInstanceCardData` (`src/utils/services.ts`) sets the flag, and nothing calls it.
- `ServiceInstanceCard` has a single caller, `PublicServiceInstanceCard`, so its `rightAction` and `hoverLinks`
  branches are unreachable too.
- No test renders the card illustration: `PublicServiceInstanceCard.test.tsx` builds every card with
  `illustrationDocumentUrl: null`, so a missing image would go unnoticed. The 16:9 sizing itself is out of reach of
  jsdom and rests on the screenshots.
