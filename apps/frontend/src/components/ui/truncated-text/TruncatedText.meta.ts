import type { ComponentMeta } from '@filigran/design-system/meta';

export const TruncatedTextMeta: ComponentMeta = {
  name: 'TruncatedText',
  description:
    'One line of text cut off with an ellipsis at the width of its container (a table cell), shown in full in a Tooltip. The tooltip opens only when the text is actually cut off, or whenever details are given: then it shows the text followed by the details, one per line. The text is a block span, so its box is the width of the container and its overflow can be measured. Like Tooltip, it needs a TooltipProvider above it: one for the region (the whole table), not one per cell.',
  status: 'beta',
  category: 'data-display',
  version: '0.1.0',
  radixPrimitive: 'none',
  variants: ['default', 'with details'],
  sizes: [],
  examples: [
    '<TruncatedText text={customer} />',
    '<TruncatedText text={organization.name} details={emails.map((email) => <span key={email}>{email}</span>)} />',
  ],
  props: {
    text: 'string (required) - the text, cut off at the width of its container.',
    details:
      'React.ReactNode (optional) - shown under the full text in the tooltip, which then opens even when the text fits.',
  },
  accessibility: {
    wcag: '2.1 AA',
    wcagStatus: 'pending',
    notes:
      'The tooltip is the design system Tooltip: role="tooltip", described by aria-describedby on the text, closed on Escape. It opens on hover and on focus of the text; the text itself is not a tab stop. No interactive content goes in the details.',
  },
};
