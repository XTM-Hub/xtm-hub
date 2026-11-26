import type { ComponentMeta } from '@filigran/design-system/meta';

export const PopoverMeta: ComponentMeta = {
  name: 'Popover',
  description:
    'Non-modal floating Paper anchored to its trigger, for free content that is not a menu, a listbox or a tooltip. PopoverContent is the Paper itself (elevation 1, 16px padding, shadow-global-shadow) rendered in a portal above the page. Has no width: the caller sizes the panel through className.',
  status: 'beta',
  category: 'feedback',
  version: '0.1.0',
  radixPrimitive: '@radix-ui/react-popover',
  variants: ['elevation-1', 'elevation-2', 'elevation-3'],
  sizes: [],
  examples: [
    '<Popover><PopoverTrigger asChild><Button>Open</Button></PopoverTrigger><PopoverContent align="end" className="w-120">…</PopoverContent></Popover>',
    '<PopoverContent side="right" padding={8} className="w-50">…</PopoverContent>',
  ],
  props: {
    open: 'boolean (optional, on Popover) - the controlled open state.',
    onOpenChange:
      '(open: boolean) => void (optional, on Popover) - called when the trigger, Escape or an outside press opens or closes it.',
    asChild:
      'boolean (optional, on PopoverTrigger) - renders the trigger behaviour on its single child, such as a Button or an IconButton.',
    elevation:
      '1 | 2 | 3 (optional, default 1, on PopoverContent) - the Paper elevation; raise it for a panel opened from a raised surface.',
    padding:
      '0 | 8 | 16 | 24 | 32 (optional, default 16, on PopoverContent) - the Paper padding in px.',
    side: "'top' | 'right' | 'bottom' | 'left' (optional, default 'bottom', on PopoverContent) - the trigger side the panel opens on.",
    align:
      "'start' | 'center' | 'end' (optional, default 'start', on PopoverContent) - the panel alignment along that side.",
    sideOffset:
      'number (optional, default 4, on PopoverContent) - the gap in px between the trigger and the panel.',
    className:
      'string (optional, on PopoverContent) - extra classes, merged last with tailwind-merge (a width, a pt-4 on top of padding={0}).',
    ref: 'React.Ref<HTMLDivElement> (optional, on PopoverContent) - forwarded to the panel <div> element.',
  },
  accessibility: {
    wcag: '2.1 AA',
    wcagStatus: 'pending',
    contrastPairs: [
      {
        id: 'panel text on default elevation',
        fg: '--text-default-primary',
        bg: '--bg-elevation-default',
        minRatio: 4.5,
      },
    ],
    notes:
      'Radix gives the panel role="dialog" and the trigger aria-haspopup="dialog", aria-expanded and aria-controls. Focus moves into the panel on open; Escape and an outside press close it and focus returns to the trigger. The caller names the trigger and, when the panel has no visible title, the panel (aria-label).',
  },
};
