---
key: 3702-markdown-renderer
issue: 3702
epic: epic-3-candidates
kind: candidate # ds | candidate | adoption | cleanup
legacy_symbols: [MarkdownRenderer]
target_module: "@/components/ui/markdown-renderer"
target_symbols: [MarkdownRenderer]
legacy_files_to_delete: [apps/frontend/src/components/filigran-ui/components/clients/MarkdownRenderer.tsx, apps/frontend/src/components/ui/MarkdownRendererWithTheme.tsx]
---

# MarkdownRenderer → `@/components/ui/markdown-renderer`, rebuilt on `Text`, `Separator` and tokens

## Intent

The design system ships no markdown or prose component. The legacy `MarkdownRenderer` is `MDEditor.Markdown` from
`@uiw/react-md-editor` inside a `data-color-mode` div, painted by the library's GitHub stylesheet (`wmde-markdown`)
and, at every call site, by the unlayered `.markdown-content` rules of `styles/globals.css`. Its consumers: the
`MarkdownRendererWithTheme` wrapper (next-themes to `colorMode`; epic detail dialog, feature vote dialog, private
resource overview) and two public pages that pass `colorMode="dark"` (connector page, document page). It is rebuilt
as a candidate in `src/components/ui/markdown-renderer/`: the same parser, the library's stylesheet switched off, each
element rendered through the design system `Text` (and the `Separator` candidate) with tokens. What every page shows
stays: the same markdown, GFM tables, task lists and strikethrough included, with the author's heading levels, links
and emphasis.

## The component

`src/components/ui/markdown-renderer/`, the package layout:

- `MarkdownRenderer.tsx` (`'use client'`): props `source: string`, `className?: string`. No `colorMode`: tokens follow
  the `.light` / `.dark` class next-themes sets on `html`, and the public pages that forced `dark` are forced dark by
  `AppContext` already. Renders `MDEditor.Markdown` (TDR-13: `@uiw/react-md-editor` stays the one markdown library;
  `react-markdown` is not a declared dependency) with:
  - `prefixCls=""`: drops `wmde-markdown wmde-markdown-color`, so none of the library's styles apply.
  - `className={cn('flex flex-col gap-3 break-words [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-sm', className)}`
    (`cn` from `@/lib/utils`, `className` last), plus `[&>a]:self-start [&>img]:self-start` so a raw HTML image block
    keeps its natural width. No colour: the text inherits the surface's.
  - `rehypePlugins={[[rehypeSanitize, schema]]}` (`rehype-sanitize`, the default GitHub schema with one stricter rule:
    a `code` class must be a single `language-*` token, since the library's attribute comments set `className` as one
    string the default pattern would check as a whole), as `MarkdownInput`'s own preview: readers see what the
    author's preview showed (Decisions).
  - `disableCopy`, and `rehypeRewrite` dropping the anchor that the library prepends to each heading (a heading's first
    child `a` goes when it is `aria-hidden`, the library's own mark, so an author link opening a heading stays). Both
    rendered raw library glyphs the stylesheet hid or styled.
  - `components`, each override dropping react-markdown's `node` prop before spreading the rest:

| Element | Rendering |
| --- | --- |
| `h1` … `h6` | `Text as="hN"`: `h1` `title-lg` (24px), `h2` `title-md` (20px), `h3` `title-sm` (16px bold), `h4` to `h6` `title-xs` (14px) |
| `p` | `Text variant="content-base"` |
| `a` | `Text as="a" variant="content-base-link"`, `href` and the other props kept (no `target` added) |
| `ul`, `ol` | `flex flex-col gap-1 pl-6` + `list-disc` / `list-decimal` |
| `li` | `Text as="li" variant="content-base"`, its own blocks 8px apart (inline content untouched); a task-list item has no marker, only its checkbox |
| `blockquote` | `flex flex-col gap-2 border-l-4 border-elevation-subtle pl-4 text-default-secondary` |
| `code` | `Text variant="content-code"` with `rounded-sm bg-elevation-highlight px-1` |
| `pre` | `overflow-x-auto rounded-sm bg-elevation-highlight p-4`, its `code` child without background or padding |
| `hr` | `Separator decorative={false}` from `@/components/ui/separator` (keeps the `separator` role of `hr`) |
| `table` | `w-full border-collapse`; `th` `Text as="th" variant="content-base-bold"`, `td` `Text as="td" variant="content-base"`, both `border border-elevation-subtle px-3 py-2 text-left`, `th` on `bg-elevation-highlight` |

  `strong`, `em`, `del`, `img` and the task-list `input` keep their native elements, unstyled.
- `MarkdownRenderer.meta.ts`: `MarkdownRendererMeta`, typed `ComponentMeta` from `@filigran/design-system/meta` (type
  import only), on the model of `Accordion.meta.ts`: name, description (renders a markdown string, GFM included, as
  design system typography: headings on the title scale, body on `content-base`, code on `content-code`, 12px between
  blocks; sanitised; no colour or background of its own), `status: 'beta'`, `category: 'data-display'`,
  `version: '0.1.0'`, `radixPrimitive: 'none'`, variants `default`, no size, two examples (a description; a
  `className="p-6"` overview), `props`, and `accessibility` with `wcagStatus: 'pending'`, the contrast pairs
  `--text-default-primary` and `--text-default-secondary` (blockquote) on `--bg-elevation-default` at 4.5,
  `--text-default-primary` on `--bg-elevation-highlight` (code, table header) at 4.5, the link focus ring at 3, and notes:
  native elements keep their semantics (the author's heading levels, lists, a `table` with header cells, `hr` as a
  separator), links are underlined with the `Text` focus ring, no heading anchor or copy control is rendered.
- `MarkdownRenderer.test.tsx`: each heading level renders its `hN` with its `Text` variant class (one `it.each`); a
  paragraph, a `strong` and a link with its `href` and `content-base-link`; a bullet and a numbered list; inline code
  and a fenced block in a `pre`; `---` is a `separator`; a GFM table exposes a `table` with `columnheader` and `cell`;
  a heading contains no generated anchor but keeps an author link that opens it; a fenced block renders its `code`
  only; a task list keeps its checkboxes; `~~x~~` is a `del`; a quote is a `blockquote` in the secondary colour; raw
  `<script>`, an `onerror` attribute (the `img` stays), a `style` attribute, a `javascript:` link and utility classes
  smuggled through an attribute comment are stripped while the text around them stays; a caller's `className` reaches
  the root and replaces the default gap; an empty `source` renders an empty root.
- `index.ts`: exports `MarkdownRenderer` and `MarkdownRendererProps`, never the meta.

## Props mapping

| Legacy usage | Target usage | Call sites |
| --- | --- | --- |
| `<MarkdownRendererWithTheme source />` (theme bridge) | `<MarkdownRenderer source />` from `@/components/ui/markdown-renderer` | 4 (`EpicItemDetailed` × 2, `FeatureVoteDetail`) |
| `<MarkdownRendererWithTheme source className="p-l !bg-elevation-background-layer-1 markdown-content" />` | `<MarkdownRenderer source className="p-l" />` | 1 (`ShareableResourceDescription`) |
| `<MarkdownRenderer source colorMode="dark" className="p-l !bg-elevation-background-layer-1 markdown-content" />` from `@filigran/ui/clients` | `<MarkdownRenderer source className="p-l" />` | 2 (`ShareableResourceConnectorSlugPublic`, the public document `page.tsx`) |
| `markdown-content` on a wrapper of the renderer | removed: its unlayered rules beat every utility of the candidate (Decisions). `EpicItemDetailed`'s section `<h3>` keeps its look with the classes the rule gave it, `className="mt-4 mb-2 text-lg font-semibold"`; its footer wrapper, which holds no markdown, keeps the class | 2 (`EpicItemDetailed` scroll area, `FeatureVoteDetail` root) |

`!bg-elevation-background-layer-1` only beat the library's own background; the section around it paints the same one.

## Files in scope

- `apps/frontend/src/components/ui/markdown-renderer/MarkdownRenderer.tsx`, `MarkdownRenderer.meta.ts`,
  `MarkdownRenderer.test.tsx`, `index.ts` (new)
- `apps/frontend/src/components/epic/epic-item/EpicItemDetailed.tsx`
- `apps/frontend/src/components/feature-voting/FeatureVoteDetail.tsx`
- `apps/frontend/src/components/service/document/ShareableResourceDescription.tsx`
- `apps/frontend/src/components/service/document/connector/ShareableResourceConnectorSlugPublic.tsx`
- `apps/frontend/app/(public)/[locale]/cybersecurity-solutions/[slug]/[docSlug]/page.tsx`
- `apps/frontend/src/components/filigran-ui/components/clients/index.ts` (drop `export * from './MarkdownRenderer'`)
- Delete `apps/frontend/src/components/filigran-ui/components/clients/MarkdownRenderer.tsx` and
  `apps/frontend/src/components/ui/MarkdownRendererWithTheme.tsx`

The existing tests stay as they are and must pass: `EpicItemDetailed.test.tsx` (the `h3` section titles, `strong`
from `**problem**`, the description text) and `ShareableResourceConnectorSlugPublic.test.tsx`. No e2e locator reads
the rendered markdown: the roadmap model opens an epic by its title, and the resource specs only fill descriptions.

## Screens

The cookie banner is dismissed first, then the trial Snackbar (it covers the bottom left of the dialogs). The epic and
feature vote dialogs follow the theme; the public document page is always dark. The development data holds plain
paragraphs only: headings, lists, code and tables are covered by the candidate's unit test, not by a screen.

```json
[
  {
    "name": "epic-detail",
    "path": "/app",
    "steps": [
      { "click": "role=button[name=\"Reject all\"]" },
      { "click": "li:has-text(\"Start your 30-day free trial\") >> role=button[name=\"Close\"]" },
      { "click": "role=link[name=\"XTM Platform Roadmap\"]" },
      { "click": "main li h2 >> role=button" },
      { "waitFor": "role=dialog" }
    ],
    "clip": "role=dialog"
  },
  {
    "name": "feature-vote-detail",
    "path": "/app",
    "steps": [
      { "click": "role=button[name=\"Reject all\"]" },
      { "click": "li:has-text(\"Start your 30-day free trial\") >> role=button[name=\"Close\"]" },
      { "click": "role=link[name=\"XTM Platform Roadmap\"]" },
      { "click": "role=link[name=\"Vote for your next feature\"]" },
      { "click": "main h2 >> role=button" },
      { "waitFor": "role=dialog" }
    ],
    "clip": "role=dialog"
  },
  {
    "name": "public-document-overview",
    "path": "/en/cybersecurity-solutions/opencti-custom-dashboards",
    "steps": [
      { "click": "role=button[name=\"Reject all\"]" },
      { "click": "main a[href*=\"/opencti-custom-dashboards/\"]" },
      { "waitFor": "main section:has(> h2)" }
    ],
    "clip": "main section:has(> h2)"
  }
]
```

## Out of scope

- `MarkdownInput` and its `@uiw` editor and preview (the editor keeps the library's look), and the `.wmde-markdown` /
  `.markdown-content` rules of `styles/globals.css` (a shared file: the cleanup item, 3708).
- The callers' other classes, the `EpicItemDetailed` footer and its `markdown-content` wrapper, `useHasMounted`.
- `@uiw/react-md-editor` and `rehype-sanitize` in `apps/frontend/package.json`: the candidate imports both.

## Accessibility and i18n

- Kept: the author's heading levels, lists, emphasis, links and their names, a native `table`, `hr` as a `separator`.
- Gone: the heading anchors (`aria-hidden`, `tabindex="-1"`, mouse only) and the code block copy control (a `div`
  with a click handler, unreachable by keyboard).
- Gained: links get the `Text` link focus ring.
- No translation key added or removed.

## Verification

- `yarn workspace @xtm-hub/frontend lint`
- `yarn workspace @xtm-hub/frontend format:check`
- `yarn workspace @xtm-hub/frontend check-ts`
- `yarn workspace @xtm-hub/frontend test src/components/ui/markdown-renderer src/components/epic src/components/feature-voting src/components/service/document src/components/filigran-ui`
- `yarn workspace @xtm-hub/frontend i18n:check`
- `node ds-migration/validate.mjs ds-migration/specs/3702-markdown-renderer.md`

## Decisions

- **Same parser, library styles off**: `MDEditor.Markdown` keeps GFM, alerts and highlighting classes, and the one
  markdown library of TDR-13; a new `react-markdown` dependency is a shared-file change. `prefixCls=""` is the
  library's switch for its stylesheet, which `data-color-mode` only re-coloured.
- **Elements through `Text`**: the design system's typography primitive renders any tag (`as`), so every block takes
  a Named Style rather than raw sizes. Headings keep the legacy order and nearly its sizes (24, 20, then 16 and 14
  where the legacy had 18 and 16).
- **Spacing by `gap` on flex containers**: `Text` resets margins (`m-0`); a gap does not fight that reset. 12px between
  blocks, the legacy `my-3`.
- **`markdown-content` goes from the renderer's wrappers**: its rules are unlayered, so they beat every Tailwind
  utility of the candidate (`Text`'s sizes, `m-0`, the gaps) and would bring the legacy look back. The epic section
  titles move the three utilities the rule gave them onto their own `h3`, so that code around the renderer looks the
  same.
- **Sanitised**: the legacy rendered raw HTML as is. `rehype-sanitize`'s default schema, already applied by
  `MarkdownInput`'s preview, keeps the GitHub subset (`details`, `br`, `img`, `kbd`, tables) and drops scripts, event
  attributes, `style` and unsafe URLs; the library inserts it after its raw HTML parser and `rehype-attr`, before
  its syntax highlighter.
- **`Separator` for `hr`**: the candidate the app already uses for rules, `decorative={false}` for the role.

## To validate

- Markdown takes the design system typography: headings on the title scale (`h1` 24px medium, `h2` 20px medium,
  `h3` 16px bold, `h4`–`h6` 14px semibold) instead of the legacy semibold 24/20/18/16px with a rule under `h1` and
  `h2`; links underlined in the text colour with a medium weight instead of the primary colour; quotes upright in the
  secondary colour. Alternative: the `Text` migration table's page scale (`h1` `title-2xl` 32px), too large inside a
  section.
- Code blocks lose their syntax colours and their copy button. Alternative: a token-based highlight theme and a design
  system `IconButton` copy control, which the design system ships for no component.
- Headings lose the link icon shown on hover. Alternative: a visible anchor control.
- 12px between blocks. Alternative: `gap-4` (16px), the GitHub stylesheet's spacing.
- Task-list items show their checkbox inside the list indent, with no bullet. Alternative: the GitHub stylesheet's
  checkbox pulled into the gutter.
- The feature vote dialog title gets the design system `DialogTitle` look back: the `markdown-content` rule had given
  it 20px semibold, a bottom rule and extra margins.
- `category: 'data-display'` in the meta, next to `Text`. Alternative: `surface`.
- The feature vote illustration fills its 192px box exactly: the `markdown-content` image rule had pushed it 12px
  down and rounded it.

## Deferred findings

- `MarkdownInput`'s preview keeps the library's GitHub look, so the author's preview and the published rendering now
  differ in style (same content): the editor is its own item.
- In-page links to a heading (`[x](#section)`) do not resolve: the sanitiser prefixes ids with `user-content-`, as in
  `MarkdownInput`'s preview.
- Footnotes do not resolve: the parser already prefixes their ids with `user-content-` and the sanitiser prefixes
  them again, as in `MarkdownInput`'s preview.
- GitHub alerts (`> [!NOTE]`) render as a bare `div` (the sanitiser drops their class and icon): the title paragraph
  sits against the body with no gap or border, where the design system `Alert` fits. Blocks inside a raw `<div>` or
  `<details>` get no gap either.
- The syntax highlighter still tokenises and splits into lines every fenced block, server side and on hydration, at a
  cost that grows faster than the block's length, though no style colours the tokens any more: the library's
  `pluginsFilter` could drop it.
- The `Text` link focus ring is an outer ring: inside the epic and feature vote dialogs' scroll areas, which have no
  padding, a link on the first line or at a line start loses part of it.
- The component re-parses its source on every parent render, as the legacy did: a `memo` would spare the epic dialog
  one parse per section.
- The sanitiser is the only guard on raw HTML and depends on the library inserting caller plugins after its raw HTML
  parser: the unit tests pin scripts, `style`, `javascript:` links and attribute-comment classes, an upgrade of
  `@uiw/react-md-editor` should re-check it.
- `ShareableResourceDescription`, the public document page and the connector page have no test reading the rendered
  description.
- A link inside a heading or a table header takes the `content-base-link` size and weight rather than the heading's.
- Markdown headings start at `h1` inside pages and dialogs that have their own `h1` / `h2`: the outline depends on
  what authors write.
- `MDEditor.Markdown` brings the editor bundle and its stylesheet to every reading page, as before.
