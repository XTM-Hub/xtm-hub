import type { ComponentMeta } from '@filigran/design-system/meta';

export const AvatarMeta: ComponentMeta = {
  name: 'Avatar',
  description:
    'Round picture of a person. Preloads src and shows the image, cropped with object-cover, only once it loaded; while it loads, when it fails and without src it shows the user Icon on bg-elevation-highlight. Has no size: it fills its parent, or the caller sizes it through className.',
  status: 'beta',
  category: 'data-display',
  version: '0.1.0',
  radixPrimitive: 'none',
  variants: ['image', 'fallback'],
  sizes: [],
  examples: [
    '<Avatar src={user.picture} className="size-8" />',
    '<Avatar className="size-6" />',
  ],
  props: {
    src: 'string (optional) - the picture URL; empty or missing shows the fallback glyph.',
    alt: 'string (optional, default "") - the text alternative of the image, and of the fallback while it loads or after it fails; pass it only for a standalone avatar.',
    className:
      'string (optional) - extra classes, merged last with tailwind-merge (a size-8 replaces the default size-full).',
    ref: 'React.Ref<HTMLSpanElement> (optional) - forwarded to the root <span> element.',
  },
  accessibility: {
    wcag: '2.1 AA',
    wcagStatus: 'pending',
    contrastPairs: [
      {
        id: 'fallback glyph on highlight elevation',
        fg: '--icon-default',
        bg: '--bg-elevation-highlight',
        minRatio: 3,
      },
    ],
    notes:
      '1.1.1 Non-text Content: decorative by default, the image has alt="" and the fallback glyph is aria-hidden, so the caller names the person next to it. Pass alt only for a standalone avatar: it names the image and, while the image loads or after it fails, the fallback (role="img" with aria-label, the glyph staying aria-hidden). No keyboard or focus behaviour of its own.',
  },
};
