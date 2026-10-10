import type { ComponentMeta } from '@filigran/design-system/meta';

export const SeparatorMeta: ComponentMeta = {
  name: 'Separator',
  description:
    'Standalone 1px rule between two pieces of content, horizontal or vertical. Draws the same border-elevation-subtle rule as MenuSeparator, SelectSeparator and NavbarSeparator, so a separator outside those components matches the ones the design system draws. Owns its colour and width; callers pass only layout and spacing classes.',
  status: 'beta',
  category: 'surface',
  version: '0.1.0',
  radixPrimitive: 'none',
  variants: ['horizontal', 'vertical'],
  sizes: [],
  examples: [
    '<Separator className="my-s" />',
    '<Separator orientation="vertical" className="h-6" />',
  ],
  props: {
    orientation:
      "'horizontal' | 'vertical' (optional, default 'horizontal') - a full-width top border, or a full-height left border.",
    decorative:
      'boolean (optional, default true) - role="none" when true; role="separator" when false, with aria-orientation="vertical" when vertical.',
    className:
      'string (optional) - extra classes, merged last with tailwind-merge (spacing, a height replacing the vertical h-full).',
    ref: 'React.Ref<HTMLDivElement> (optional) - forwarded to the <div> element.',
  },
  accessibility: {
    wcag: '2.1 AA',
    wcagStatus: 'pending',
    notes:
      'Decorative by default (role="none"): the rule stays out of the accessibility tree and carries no information, so 1.4.11 Non-text Contrast does not apply. decorative={false} exposes role="separator", with aria-orientation="vertical" when vertical. No keyboard or focus behaviour of its own.',
  },
};
