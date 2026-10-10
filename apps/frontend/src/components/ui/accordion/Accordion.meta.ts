import type { ComponentMeta } from '@filigran/design-system/meta';

export const AccordionMeta: ComponentMeta = {
  name: 'Accordion',
  description:
    'Stacked disclosure sections: each item is a full-width trigger ending with a 16px chevron-down that turns when the item is open, over a content region shown only while open. Has no typography or colour of its own: the label inherits from the caller, who sets its type and hover on the trigger or on a child span.',
  status: 'beta',
  category: 'navigation',
  version: '0.1.0',
  radixPrimitive: '@radix-ui/react-accordion',
  variants: ['single', 'multiple'],
  sizes: [],
  examples: [
    '<Accordion type="single" collapsible><AccordionItem value="general"><AccordionTrigger>General</AccordionTrigger><AccordionContent>…</AccordionContent></AccordionItem></Accordion>',
    '<Accordion type="multiple" defaultValue={["types"]}><AccordionItem value="types"><AccordionTrigger className="p-s">Types</AccordionTrigger><AccordionContent className="pb-s pr-s">…</AccordionContent></AccordionItem></Accordion>',
  ],
  props: {
    type: "'single' | 'multiple' (required, on Accordion) - whether one item or several can be open at once.",
    collapsible:
      "boolean (optional, default false, on Accordion with type='single') - lets the open item close on a second press.",
    value:
      "string | string[] (optional on Accordion, required string on AccordionItem) - on Accordion, the controlled open item value, an array when type='multiple'; on AccordionItem, the identifier that value refers to.",
    defaultValue:
      "string | string[] (optional, on Accordion) - the items open at mount when uncontrolled, an array when type='multiple'.",
    onValueChange:
      '(value: string | string[]) => void (optional, on Accordion) - called when an item opens or closes.',
    className:
      'string (optional, on every part) - extra classes, merged last with tailwind-merge (a pr-0 replaces the trigger pr-2; on AccordionContent it reaches the inner div, where a pb-0 replaces pb-2 and the default pt-0 keeps a py-s off the top).',
    ref: 'React.Ref (optional) - forwarded to the item <div>, the trigger <button> and the content region <div>.',
  },
  accessibility: {
    wcag: '2.1 AA',
    wcagStatus: 'pending',
    contrastPairs: [
      {
        id: 'label text on default elevation',
        fg: '--text-default-primary',
        bg: '--bg-elevation-default',
        minRatio: 4.5,
      },
      {
        id: 'focus ring',
        fg: '--color-filigran-brand-primary',
        bg: '--bg-elevation-default',
        minRatio: 3,
      },
    ],
    notes:
      'Radix renders each trigger as a button with aria-expanded and aria-controls inside a heading (h3); the content is a region named by its trigger. Arrow keys, Home and End move between triggers; Enter and Space toggle the focused item. The chevron is decorative (aria-hidden) and stays out of the accessible name. The focus indicator is an inset 2px outline-focus outline, so it survives inside scroll containers that would clip an outer ring.',
  },
};
