import type { ComponentMeta } from '@filigran/design-system/meta';

export const SheetMeta: ComponentMeta = {
  name: 'Sheet',
  description:
    'Modal side panel: a full-height Paper at elevation 2 (square corners, shadow-global-shadow) against the left or right edge of the viewport, full width then half the viewport from md, over the Dialog scrim. SheetContent lays out a 64px heading bar (SheetHeader on bg-elevation-heading), a scrolling body around its children, the close button in the heading bar and, inside the body, a SheetFooter row of right-aligned actions.',
  status: 'beta',
  category: 'feedback',
  version: '0.1.0',
  radixPrimitive: '@radix-ui/react-dialog',
  variants: ['right', 'left'],
  sizes: [],
  examples: [
    '<Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><Button>Add user</Button></SheetTrigger><SheetContent><SheetHeader><SheetTitle>Add user</SheetTitle><SheetDescription>…</SheetDescription></SheetHeader><form>…<SheetFooter><Button priority="secondary">Cancel</Button><Button type="submit">Validate</Button></SheetFooter></form></SheetContent></Sheet>',
    '<Sheet><SheetTrigger>…</SheetTrigger><SheetContent side="left" closeLabel={t("Header.CloseMenu")}><SheetHeader className="flex-row"><SheetTitle>Menu</SheetTitle></SheetHeader><nav>…</nav></SheetContent></Sheet>',
  ],
  props: {
    open: 'boolean (optional, on Sheet) - the controlled open state.',
    onOpenChange:
      '(open: boolean) => void (optional, on Sheet) - called when the trigger, the close button, Escape or an outside press opens or closes it.',
    asChild:
      'boolean (optional, on SheetTrigger) - renders the trigger behaviour on its single child, such as a Button.',
    side: "'left' | 'right' (optional, default 'right', on SheetContent) - the viewport edge the panel is drawn against.",
    closeLabel:
      "string (optional, default 'Close', on SheetContent) - the accessible name of the close button; pass a translation.",
    onEscapeKeyDown:
      '(event: KeyboardEvent) => void (optional, on SheetContent) - called before Escape closes the sheet, prevent it to keep the sheet open; not called for an Escape from an expanded combobox.',
    onPointerDownOutside:
      '(event: PointerDownOutsideEvent) => void (optional, on SheetContent) - called before an outside press closes the sheet, prevent it to keep the sheet open.',
    onOpenAutoFocus:
      '(event: Event) => void (optional, on SheetContent) - called when focus moves into the panel on open, prevent it to keep focus where it is.',
    className:
      'string (optional, on every part) - extra classes, merged last with tailwind-merge (a background class replaces the panel bg-elevation-default; a pb-0 replaces the SheetFooter pb-6).',
    ref: 'React.Ref (optional) - forwarded to the panel <div>, the SheetTitle <h2> and the SheetDescription <p>.',
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
      {
        id: 'title on heading elevation',
        fg: '--text-default-primary',
        bg: '--bg-elevation-heading',
        minRatio: 4.5,
      },
    ],
    notes:
      'Radix renders the panel as a modal role="dialog" named by SheetTitle and described by SheetDescription. Focus is trapped inside while open and returns to the trigger on close; Escape and an outside press close it. The close button comes last in the tab order, so focus on open lands on the first field, and is named by closeLabel. An Escape from an expanded combobox (role="combobox" with aria-expanded="true") is left to the combobox, which closes its own list.',
  },
};
