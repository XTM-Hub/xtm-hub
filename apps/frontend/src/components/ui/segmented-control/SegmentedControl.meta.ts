import type { ComponentMeta } from '@filigran/design-system/meta';

export const SegmentedControlMeta: ComponentMeta = {
  name: 'SegmentedControl',
  description:
    'Segmented control with text labels: a radiogroup of buttons sharing one selected value, for switching between mutually exclusive views of the same data (a period, a scope). It is the labelled counterpart of ButtonGroup, whose items are icon-only. The run is outlined in the default elevation border, with the same 1px border between segments and the outer corners rounded at 4px. The selected segment is filled with the brand primary colour and its label in negative ink (brand tertiary on hover), the others stay transparent with the label in default primary ink and a 10% brand wash on hover. Labels use the content-button text style, semibold. Clicking the selected segment does nothing; arrow keys move the selection along the run. Disabled, the whole run follows the isolated ButtonGroup: disabled border and ink, the selected segment on the disabled input fill. A single segment can be disabled on its own, in disabled ink with no hover wash (on the disabled input fill when it is the selected one), and carry a tooltip giving the reason.',
  status: 'beta',
  category: 'inputs',
  version: '0.1.0',
  radixPrimitive: 'none',
  variants: [
    'default',
    'selected',
    'disabled',
    'selected + disabled',
    'disabled item',
  ],
  sizes: ['sm', 'md'],
  examples: [
    '<SegmentedControl aria-label="Period" items={[{ value: "7", label: "7 days" }, { value: "30", label: "30 days" }]} value={period} onValueChange={setPeriod} />',
    '<SegmentedControl aria-label="Period" items={items} value={period} onValueChange={setPeriod} size="sm" />',
    '<SegmentedControl aria-label="Period" items={[{ value: "30", label: "30 days" }, { value: "180", label: "180 days", disabled: true, tooltip: "Coming soon" }]} value={period} onValueChange={setPeriod} />',
  ],
  props: {
    items:
      '{ value: T; label: string; disabled?: boolean; tooltip?: string }[] (required) - the segments, in display order; 2 to 5 of them, a Select beyond. A disabled segment cannot be picked and the keyboard skips it; its tooltip, shown on hover, tells why.',
    value: 'T (required) - the selected value (controlled).',
    onValueChange:
      '(value: T) => void (required) - fires when another segment is clicked or reached with the keyboard, never for the selected one.',
    'aria-label': 'string (required) - accessible name of the group.',
    size: "'sm' | 'md' (optional) - 24px or 36px tall, md by default.",
    disabled:
      'boolean (optional) - disables every segment: no click, no tab stop, no value change. False by default.',
    className: 'string (optional) - extra classes on the group.',
  },
  accessibility: {
    wcag: '2.1 AA',
    wcagStatus: 'pending',
    notes:
      'role="radiogroup" named by aria-label, holding native buttons with role="radio" and aria-checked, mirroring ButtonGroup: a segmented control is a single-choice picker. Roving tabindex: the group is one tab stop, entered at the selected segment (or the first one when the value matches none). Arrow keys move the focus and select (selection follows focus, the WAI-ARIA radiogroup pattern), Home/End jump to the ends, and navigation wraps; like ButtonGroup, a disabled segment is skipped and never the entry point, even when selected: the group is then entered at its first enabled segment. A click still focuses a disabled segment, and the arrows leave it for its nearest enabled neighbour. It carries aria-disabled rather than the native attribute, so it still takes the hover that opens its tooltip; Enter and Space keep the native button activation. Disabled, the group carries aria-disabled and every segment the native disabled attribute, so the run leaves the tab order. The focus ring is the library-wide ring-2/ring-offset-2 recipe with z-10, so it paints above the flush neighbouring segments.',
  },
};
