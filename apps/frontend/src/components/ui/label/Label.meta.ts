import type { ComponentMeta } from '@filigran/design-system/meta';

export const LabelMeta: ComponentMeta = {
  name: 'Label',
  description:
    'Standalone field label, for a control that does not draw its own. Renders a native <label> through Text (content-compact-medium) in the input label colour, so it matches the label the design system fields (Input, Textarea, Select...) draw themselves. Fields that take a `label` prop do not need it.',
  status: 'beta',
  category: 'inputs',
  version: '0.1.0',
  radixPrimitive: 'none',
  variants: ['default', 'error'],
  sizes: [],
  examples: [
    '<Label htmlFor="organization-name">Organization name</Label>',
    '<Label htmlFor="organization-name" error>Organization name</Label>',
  ],
  props: {
    children: 'React.ReactNode (required) - the label text.',
    htmlFor:
      'string (optional) - the id of the control the label names, as on a native <label>.',
    error:
      'boolean (optional, default false) - switches the colour to the input error token; the field message and aria-invalid carry the error itself.',
    className:
      'string (optional) - extra classes, merged last with the design system tailwind-merge (layout, spacing).',
    ref: 'React.Ref<HTMLLabelElement> (optional) - forwarded to the <label> element.',
  },
  accessibility: {
    wcag: '2.1 AA',
    wcagStatus: 'pending',
    contrastPairs: [
      {
        id: 'label text on default elevation',
        fg: '--text-input-label',
        bg: '--bg-elevation-default',
        minRatio: 4.5,
      },
      {
        id: 'error label text on default elevation',
        fg: '--text-input-error',
        bg: '--bg-elevation-default',
        minRatio: 4.5,
      },
    ],
    notes:
      '1.3.1 Info and Relationships: a native <label>, so htmlFor gives the control its accessible name with no ARIA substitute. 1.4.1 Use of Color: the error state is colour only; the field message and aria-invalid on the control carry it. No keyboard or focus behaviour of its own.',
  },
};
