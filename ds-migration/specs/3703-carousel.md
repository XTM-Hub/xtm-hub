---
key: 3703-carousel
issue: 3703
epic: epic-3-candidates
kind: candidate # ds | candidate | adoption | cleanup
legacy_symbols: [Carousel, CarouselItem]
target_module: "@/components/ui/carousel"
target_symbols: [Carousel, CarouselItem]
legacy_files_to_delete: [apps/frontend/src/components/filigran-ui/components/clients/Carousel.tsx]
---

# Carousel → `@/components/ui/carousel`, rebuilt on Embla, the design system `IconButton`, `Icon` and tokens

## Intent

The design system ships no carousel or slide indicator. The legacy `Carousel` (`embla-carousel-react`, the design
system `IconButton` restyled round with forced light borders and glyphs, and hand-rolled dot buttons) has one consumer,
`ShareableResourceCarouselView`: the resource image strip (`h-[35vh]`) and, in a `Dialog` opened by a click on an
image, the enlarged strip (`h-[80vh]`) starting on that image. It renders on the four resource detail pages (public
document, public connector, private resource, private connector). It is rebuilt as a candidate in
`src/components/ui/carousel/` on the same Embla engine, `IconButton`, `Icon` and tokens. What users get stays: a looping
horizontal strip, previous / next buttons, at most six dots around the current slide, arrow keys, a click on an image
opening the enlarged strip on it.

## The component

`src/components/ui/carousel/`, the package layout:

- `Carousel.tsx` (`'use client'`), classes merged with the app's `cn` (`@/lib/utils`), `className` last:
  - `Carousel`: props `HTMLAttributes<HTMLDivElement>` plus `opts?: Omit<EmblaOptionsType, 'axis'>` (type from
    `embla-carousel`), `previousLabel?: string` (default `'Previous slide'`), `nextLabel?: string` (default
    `'Next slide'`), `slideLabel?: (slide: number) => string` (1-based, default ``(slide) => `Go to slide ${slide}` ``),
    the design system's label-prop convention (`previousMonthLabel`, `removeFileLabel`). Calls
    `useEmblaCarousel({ loop: true, ...opts, axis: 'x' })`. Root: `div` with the forwarded ref, `role="region"`,
    `aria-roledescription="carousel"`, `onKeyDownCapture` (ArrowLeft → `scrollPrev`, ArrowRight → `scrollNext`, both
    `preventDefault`), `cn('relative', className)`, the rest of the props. Inside: the viewport
    `div` (Embla ref, `h-full overflow-hidden`) > the container `div` (`flex h-full`) > `children`; then the two
    buttons and the dots.
  - Previous / next: `IconButton priority="primary"` (default `md`, 36px), `aria-label={previousLabel}` /
    `{nextLabel}`, `icon={<Icon name="chevron-left" size={16} />}` / `chevron-right` (`icon-mapping.json`:
    `keyboard_arrow_left` / `right`), `disabled` from Embla's `canScrollPrev()` / `canScrollNext()`, classes
    `absolute top-1/2 left-4 -translate-y-1/2` / `right-4` (placement only).
  - Dots: a `div` (`absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2`) of native `button type="button"`, one
    per Embla scroll snap in a window of at most six centred on the selected one (the legacy `displayDots` default,
    now a constant), `aria-label={slideLabel(index + 1)}`, `aria-current={selected}`, click → `scrollTo(index)`.
    Classes: `size-4 cursor-pointer rounded-full border border-filigran-brand-primary bg-transparent p-0
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-filigran-brand-primary focus-visible:ring-offset-2
    focus-visible:ring-offset-focus` (the `IconButton` focus ring), plus `bg-filigran-brand-primary` when selected.
  - State: `selectedIndex`, `scrollSnaps`, `canScrollPrev`, `canScrollNext`, read from the Embla API on mount and on
    its `select` and `reInit` events, unsubscribed on cleanup (the legacy two effects merged into one; the legacy
    `react-hooks/set-state-in-effect` disable comment is dropped, lint reports it unused).
  - `CarouselItem`: `div` with ref, `role="group"`, `aria-roledescription="slide"`,
    `cn('relative min-w-0 shrink-0 grow-0 basis-full px-2', className)` (the legacy `px-s` is 8px).
  - Dropped, no caller: `orientation` (vertical layout), `plugins`, `setApi`, `scrollButton` / `dotButton` hover and
    none modes, `displayDots`, the `CarouselApi` type, the internal context and `useCarousel`.
- `Carousel.meta.ts`: `CarouselMeta`, typed `ComponentMeta` from `@filigran/design-system/meta` (type import only), on
  the model of `Accordion.meta.ts`: name, description (a looping horizontal strip of full-width slides, primary
  previous / next icon buttons centred on the sides, up to six dots at the bottom, arrow keys; no surface or slide
  styling of its own, the caller sizes it), `status: 'beta'`, `category: 'data-display'`, `version: '0.1.0'`,
  `radixPrimitive: 'none'`, variants `default`, no size, two examples (an image strip with `className="h-[35vh]"`;
  `opts={{ startIndex: 2 }}` with translated labels), `props`, and `accessibility` with `wcagStatus: 'pending'`, the
  contrast pairs `--text-negative-primary` on `--color-filigran-brand-primary` (button glyph) at 3,
  `--color-filigran-brand-primary` on `--bg-elevation-default` (dot) at 3 and the focus ring at 3, and notes: a
  `region` with `aria-roledescription="carousel"`, slides are `group`s with `aria-roledescription="slide"`, buttons
  named by the label props, the current dot carries `aria-current`, ArrowLeft / ArrowRight anywhere inside scroll it.
- `Carousel.test.tsx`: `vi.mock('embla-carousel-react')` with a fake API (`scrollSnapList`, `selectedScrollSnap`,
  `canScrollPrev`, `canScrollNext`, `scrollPrev`, `scrollNext`, `scrollTo`, chainable `on` / `off` that record the
  handlers), its implementation set in `beforeEach` (the global `afterEach` resets every mock). Cases: the region and
  its slides with their roles and children; options passed as `{ loop: true, ...opts, axis: 'x' }`; default English
  names and custom `previousLabel`, `nextLabel`, `slideLabel`; buttons disabled then enabled after a `select` event,
  a click calls `scrollPrev` / `scrollNext`; one dot per snap, the selected one with `aria-current="true"` and the
  filled class, a click calls `scrollTo(index)`; with ten snaps, six dots centred on the selected one; ArrowLeft /
  ArrowRight inside call `scrollPrev` / `scrollNext`; `off` on unmount; `className` and ref on the root and on
  `CarouselItem`.
- `index.ts`: exports `Carousel`, `CarouselItem`, `CarouselProps`, `CarouselItemProps`, never the meta.

## Props mapping

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| `<Carousel className={cn('h-[35vh]', className)}>` from `@filigran/ui/clients` | same, from `@/components/ui/carousel`, plus `previousLabel={t('DesignSystem.Carousel.Previous')}`, `nextLabel={t('DesignSystem.Carousel.Next')}`, `slideLabel={(slide) => t('DesignSystem.Carousel.GoToSlide', { slide })}` | 1 (`ShareableResourceCarouselView`) |
| `<Carousel className="h-[80vh]" opts={{ startIndex: pictureIndex }}>` inside `DialogContent` | same, the same three labels | 1 (`ShareableResourceCarouselView`) |
| `<CarouselItem key className="cursor-pointer" onClick>` / `<CarouselItem key>` | same | 2 (`ShareableResourceCarouselView`) |

The `Dialog` stays where it is, a child of the outer `Carousel`. `t` is `useTranslate()` from `@/hooks/use-translate` (lint forbids importing `useTranslations` from `next-intl`
in client code).

## Files in scope

- `apps/frontend/src/components/ui/carousel/Carousel.tsx`, `Carousel.meta.ts`, `Carousel.test.tsx`, `index.ts` (new)
- `apps/frontend/src/components/service/document/ui/ShareableResourceCarouselView.tsx`
- `apps/frontend/src/components/service/document/ui/ShareableResourceCarouselView.test.tsx` (new): nothing renders
  without images; with two images, the carousel and its translated control names (the keys, as the global
  `next-intl` mock returns them); a click on a slide opens the dialog with a second carousel.
- `apps/frontend/messages/en.json`, `fr.json`, `ja.json`: `DesignSystem.Carousel`
- `apps/frontend/src/components/filigran-ui/components/clients/index.ts`: drop `export * from './Carousel'` (the
  `clients/` barrel keeps its other exports)
- Delete `apps/frontend/src/components/filigran-ui/components/clients/Carousel.tsx`

No existing test renders the carousel (`ShareableResourceConnectorSlugPublic.test.tsx` passes no image). No e2e
locator reads a carousel, a slide or its controls.

## Screens

The dev seed holds no resource image (no `children_documents` with `image_type` `image`). The local database of this
checkout has three image children added by hand to the `Banking institutions` custom dashboard (see Decisions), so
both screens capture. The public document page is always dark.

```json
[
  {
    "name": "resource-carousel",
    "path": "/en/cybersecurity-solutions/opencti-custom-dashboards/banking-institutions",
    "steps": [
      { "click": "role=button[name=\"Reject all\"]" },
      { "waitFor": "[aria-roledescription=\"carousel\"]" }
    ],
    "clip": "[aria-roledescription=\"carousel\"]"
  },
  {
    "name": "enlarged-carousel",
    "path": "/en/cybersecurity-solutions/opencti-custom-dashboards/banking-institutions",
    "steps": [
      { "click": "role=button[name=\"Reject all\"]" },
      { "click": "[aria-roledescription=\"slide\"]" },
      { "waitFor": "role=dialog >> [aria-roledescription=\"carousel\"]" }
    ],
    "clip": "role=dialog"
  }
]
```

## Out of scope

- The view's `Dialog` (no `DialogTitle`), its nesting inside the outer carousel, the hard-coded English image `alt`
  (`A picture of {id}`) and the `next/image` props (`objectFit`, `objectPosition`).
- `embla-carousel` and `embla-carousel-react` in `apps/frontend/package.json`: the candidate imports both.
- The four detail pages around the view.

## Accessibility and i18n

- Kept: `region` + `aria-roledescription="carousel"`, slides as `group` + `slide`, the dots' `aria-current`, the arrow
  keys, disabled buttons when Embla cannot scroll.
- Changed: the control names go through next-intl. Three keys in en, fr and ja: `DesignSystem.Carousel.Previous`
  ("Previous slide" / "Diapositive précédente" / "前のスライド"), `Next` ("Next slide" / "Diapositive suivante" /
  "次のスライド"), `GoToSlide` ("Go to slide {slide}" / "Aller à la diapositive {slide}" / "スライド {slide} へ移動").
  The English names stay the legacy ones.
- Gained: the dots get the design system focus ring; the button glyphs are no longer forced to `gray-100`.

## Verification

- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test src/components/ui/carousel src/components/service/document src/components/filigran-ui`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `node ds-migration/validate.mjs ds-migration/specs/3703-carousel.md`

## Decisions

- **Embla kept**: already a dependency, it owns looping, dragging and snapping; the candidate adds only the controls.
- **`IconButton` without overrides**: the legacy rounded it, forced a `gray-100` border and glyph and shrank it to
  32px; the design system's own square 36px button replaces that look.
- **Hand-rolled dots on tokens**: the design system ships no pagination indicator; the dots take
  `filigran-brand-primary` (border, fill when current) and the `IconButton` focus ring, at the legacy 16px.
- **Labels as props, translated at the call site**: the design system convention (`previousMonthLabel`), and the
  epic's rule that every control name with a prop goes through the `DesignSystem` namespace (3545).
- **Unused modes dropped**: vertical, hover-only and hidden controls, plugins, `setApi` and `displayDots` have no
  caller, as the Accordion candidate dropped its unused `variant`.
- **Embla mocked in the unit test**: jsdom has no layout (every snap at 0) and no `IntersectionObserver`, so a real
  Embla cannot scroll there.
- **Screens on local test images** (human answer to the block, option A): three `image` children were added by hand
  to `Banking institutions` in the local database, reusing logo files already in storage. The before screens capture
  both the strip and the enlarged dialog. A dev seed of image children stays a separate backend change.

## To validate

- Previous / next become primary `IconButton`s (solid brand fill, white glyph, 36px square) instead of the legacy
  round 32px outline in light grey: they sit on the image, where the secondary outline (transparent fill) can be
  unreadable. Alternative: `priority="secondary"`, the legacy role.
- Dots stay 16px circles outlined and filled in `filigran-brand-primary`. Alternative: a 24px hit area (the
  `IconButton` `sm` size) around a smaller visual dot.
- `category: 'data-display'` in the meta. Alternative: `navigation`.

## Deferred findings

- ArrowLeft / ArrowRight pressed in the enlarged strip also scroll the page strip behind it: React bubbles the key
  event from the portalled dialog to the outer carousel's capture handler, as in the legacy.
- With a single image both buttons show disabled and one dot shows: hiding the controls when nothing scrolls is a
  behaviour change.
- The `region` has no accessible name, so it is no landmark, and slides carry no "n of m" label.
- The enlarged `DialogContent` has no `DialogTitle` (Radix warns), and the image `alt` is hard-coded English built
  from the document id.
- A click on a disabled previous / next button reaches the slide under it and opens the enlarged dialog: the design
  system `IconButton` sets `pointer-events: none` when disabled (with one image, or before Embla initialises), as in
  the legacy.
- The enlarged dialog opens only on a mouse click: the slide is a `div role="group"` with `onClick`, no focus and no
  key handler, as in the legacy.
- The arrow-key handler ignores modifiers, so Alt+ArrowLeft / Alt+ArrowRight (browser back / forward) is swallowed
  inside the carousel, and it prevents arrow keys in any future input or portal placed inside a slide; the meta's
  "anywhere inside" note documents that. Scoping it (`currentTarget.contains(target)`, no modifier) is a behaviour
  change for the upstream proposal.
- The meta's dot contrast pairs measure `--color-filigran-brand-primary` on `--bg-elevation-default`, while the dots
  sit over the slide content (a full-bleed image here), so the recorded ratios do not cover what users see.
- The three translated label props are written twice in `ShareableResourceCarouselView`; a `getCarouselLabels(t)`
  helper in `src/utils/design-system/` (like `getDatePickerLabels`) would share them once a second caller exists.
- The view test cannot check the `{ slide }` value passed to `GoToSlide`: the global `next-intl` mock returns the key
  and ignores the values.
