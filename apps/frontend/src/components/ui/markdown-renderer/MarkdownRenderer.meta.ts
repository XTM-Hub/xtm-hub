import type { ComponentMeta } from '@filigran/design-system/meta';

export const MarkdownRendererMeta: ComponentMeta = {
  name: 'MarkdownRenderer',
  description:
    'Renders a markdown string, GFM included (tables, task lists, strikethrough), as design system typography: headings on the title scale (h1 title-lg, h2 title-md, h3 title-sm, h4 to h6 title-xs), body text and list items on content-base, links on content-base-link, code on content-code, 12px between blocks. The source is sanitised (GitHub schema): scripts, event attributes, inline styles and unsafe URLs are dropped. The text inherits the colour of the surface it sits on; inline code, code blocks and table header cells sit on the highlight elevation (bg-elevation-highlight), and quotes take the secondary text colour (text-default-secondary).',
  status: 'beta',
  category: 'data-display',
  version: '0.1.0',
  radixPrimitive: 'none',
  variants: ['default'],
  sizes: [],
  examples: [
    '<MarkdownRenderer source={feature.description} />',
    '<MarkdownRenderer source={document.description} className="p-6" />',
  ],
  props: {
    source:
      'string (required) - the markdown to render; an empty string renders an empty root.',
    className:
      'string (optional) - extra classes on the root <div>, merged last with tailwind-merge (a gap-4 replaces the default gap-3).',
  },
  accessibility: {
    wcag: '2.1 AA',
    wcagStatus: 'pending',
    contrastPairs: [
      {
        id: 'body text on default elevation',
        fg: '--text-default-primary',
        bg: '--bg-elevation-default',
        minRatio: 4.5,
      },
      {
        id: 'blockquote text on default elevation',
        fg: '--text-default-secondary',
        bg: '--bg-elevation-default',
        minRatio: 4.5,
      },
      {
        id: 'code and table header text on highlight elevation',
        fg: '--text-default-primary',
        bg: '--bg-elevation-highlight',
        minRatio: 4.5,
      },
      {
        id: 'link focus ring',
        fg: '--color-filigran-brand-primary',
        bg: '--bg-elevation-default',
        minRatio: 3,
      },
    ],
    notes:
      'Native elements keep their semantics: the heading levels the author wrote, ul / ol lists, a table with th header cells, and hr exposed as a separator. Links are underlined and take the Text link focus ring. No heading anchor and no code block copy control are rendered.',
  },
};
