import type { ComponentMeta } from '@filigran/design-system/meta';

export const SkeletonMeta: ComponentMeta = {
  name: 'Skeleton',
  description:
    'Empty pulsing placeholder that stands for content still loading. Fills with the neutral bg-feedback-neutral-secondary and the 4px radius of the ProgressBar empty track, and pulses only when motion is allowed, as Spinner spins. Has no variant and no size: callers size and shape it to the content it stands for.',
  status: 'beta',
  category: 'feedback',
  version: '0.1.0',
  radixPrimitive: 'none',
  variants: ['default'],
  sizes: [],
  examples: [
    '<Skeleton className="h-24 w-full" />',
    '<Skeleton className="size-4 rounded-full" />',
  ],
  props: {
    className:
      'string (optional) - size and shape classes, merged last with tailwind-merge (a rounded-full replaces the default rounded-sm).',
    ref: 'React.Ref<HTMLDivElement> (optional) - forwarded to the <div> element.',
  },
  accessibility: {
    wcag: '2.1 AA',
    wcagStatus: 'pending',
    notes:
      'An empty <div> with no role and no accessible name, so it stays out of the accessibility tree. The region that loads owns aria-busy, as the Spinner contract RULE-02 sets out. 2.3.3 Animation from Interactions: the pulse stops under prefers-reduced-motion: reduce, the static fill stays. No keyboard or focus behaviour of its own.',
  },
};
