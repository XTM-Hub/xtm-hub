import { CSSProperties } from 'react';

/**
 * Visual identities a voting round can be published with. The palette below is
 * taken from the Thread conference site (thread.filigran.io): near-black
 * canvas and a mosaic of dim coloured pixels.
 */
export type FeatureVotingThemeName = 'default' | 'thread';

const THREAD_BACKGROUND = '#0A0A0A';
const THREAD_LIME = '#DFFFA8';
const THREAD_BLUE = '#3392FF';
const THREAD_CYAN = '#00E1FF';

/** Side of one pixel of the mosaic, and the unit every period below counts in. */
const MOSAIC_CELL_PX = 17;
/** Alpha ceiling for a pixel; most sit well below so the canvas stays dark. */
const MOSAIC_INTENSITY = 0.3;

interface MosaicSquare {
  color: string;
  alpha: number;
  /** Side of the square, in cells. */
  size: number;
  /** Tiling period, in cells. */
  period: [number, number];
  /** Offset inside the tile, in cells. */
  offset: [number, number];
}

/**
 * Drawn once with a seeded random number generator, then frozen here.
 *
 * A layer is a strict lattice, so one layer per colour makes that colour read
 * as a regular grid — especially in a banner only a handful of cells tall,
 * where a large vertical period means the colour lands on a single row. Two
 * things break that up: every colour gets several layers on unrelated periods,
 * and the horizontal periods are spread wide enough that some contribute only
 * one or two squares across the banner, as lone accents.
 */
const MOSAIC_SQUARES: MosaicSquare[] = [
  { color: THREAD_CYAN, alpha: 0.26, size: 1, period: [26, 7], offset: [2, 3] },
  {
    color: THREAD_BLUE,
    alpha: 0.19,
    size: 2,
    period: [23, 6],
    offset: [15, 4],
  },
  { color: THREAD_LIME, alpha: 0.18, size: 1, period: [17, 5], offset: [2, 2] },
  { color: '#6366F1', alpha: 0.24, size: 2, period: [23, 9], offset: [7, 5] },
  { color: '#A855F7', alpha: 0.17, size: 3, period: [15, 8], offset: [2, 5] },
  { color: '#BE4646', alpha: 0.14, size: 2, period: [29, 7], offset: [24, 5] },
  { color: '#A3A35C', alpha: 0.2, size: 2, period: [15, 3], offset: [7, 0] },
  { color: '#6EE7B7', alpha: 0.13, size: 1, period: [37, 3], offset: [23, 2] },
  { color: '#94A3B8', alpha: 0.24, size: 1, period: [26, 5], offset: [19, 1] },
  { color: '#5EEAD4', alpha: 0.14, size: 1, period: [21, 9], offset: [13, 1] },
  { color: '#D8B4FE', alpha: 0.22, size: 2, period: [23, 11], offset: [9, 10] },
  { color: '#2D78A0', alpha: 0.12, size: 1, period: [23, 5], offset: [6, 2] },
  {
    color: '#963C3C',
    alpha: MOSAIC_INTENSITY,
    size: 1,
    period: [15, 8],
    offset: [8, 4],
  },
  { color: '#818CF8', alpha: 0.21, size: 1, period: [13, 7], offset: [1, 4] },
  {
    color: THREAD_CYAN,
    alpha: 0.14,
    size: 1,
    period: [13, 8],
    offset: [12, 2],
  },
  { color: THREAD_BLUE, alpha: 0.13, size: 1, period: [9, 9], offset: [5, 4] },
  { color: THREAD_LIME, alpha: 0.13, size: 1, period: [19, 8], offset: [7, 1] },
  { color: '#6366F1', alpha: 0.19, size: 1, period: [13, 9], offset: [7, 6] },
  { color: '#A855F7', alpha: 0.15, size: 1, period: [15, 6], offset: [0, 0] },
  { color: '#BE4646', alpha: 0.27, size: 2, period: [11, 8], offset: [10, 0] },
];

const cells = (count: number) => `${count * MOSAIC_CELL_PX}px`;

const withAlpha = (hex: string, alpha: number) =>
  `${hex}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')}`;

/**
 * A conic gradient is the only background image that can draw a hard edged
 * rectangle smaller than its own tile: anchored at the far corner of the
 * square, its quarter turn covers exactly the cells above and to the left.
 * The stops are written one position at a time because the shorthand form
 * (`colour 0 90deg`) is beyond what jsdom can parse, which would drop the
 * whole declaration under test.
 */
const mosaicSquare = ({ color, alpha, size }: MosaicSquare) => {
  const fill = withAlpha(color, alpha);
  return `conic-gradient(from 270deg at ${cells(size)} ${cells(size)}, ${fill} 0deg, ${fill} 90deg, transparent 90deg)`;
};

/**
 * Opaque black over the left of the banner, so the mosaic only shows on the
 * right half and the title and the description sit on a plain canvas.
 */
const THREAD_OVERLAYS = [
  `linear-gradient(90deg, ${THREAD_BACKGROUND} 0%, ${THREAD_BACKGROUND} 45%, transparent 72%)`,
  `radial-gradient(120% 140% at 100% 0%, ${THREAD_CYAN}1F 0%, transparent 55%)`,
  `radial-gradient(90% 120% at 0% 100%, ${THREAD_BLUE}1A 0%, transparent 60%)`,
];

const THREAD_BACKGROUND_IMAGE = [
  ...THREAD_OVERLAYS,
  ...MOSAIC_SQUARES.map(mosaicSquare),
].join(', ');

const THREAD_BACKGROUND_SIZE = [
  ...THREAD_OVERLAYS.map(() => 'auto'),
  ...MOSAIC_SQUARES.map(
    ({ period }) => `${cells(period[0])} ${cells(period[1])}`
  ),
].join(', ');

const THREAD_BACKGROUND_POSITION = [
  ...THREAD_OVERLAYS.map(() => '0 0'),
  ...MOSAIC_SQUARES.map(
    ({ offset }) => `${cells(offset[0])} ${cells(offset[1])}`
  ),
].join(', ');

export interface FeatureVotingTheme {
  /** Extra classes for the banner container. */
  containerClassName: string;
  /** Inline background, needed for the mosaic which Tailwind cannot express. */
  containerStyle?: CSSProperties;
  titleClassName: string;
  descriptionClassName: string;
}

const DEFAULT_THEME: FeatureVotingTheme = {
  containerClassName: 'border-light bg-elevation-background-layer-1',
  titleClassName: 'font-semibold',
  descriptionClassName: 'text-muted-foreground text-sm',
};

const THREAD_THEME: FeatureVotingTheme = {
  containerClassName: 'border-transparent text-white',
  containerStyle: {
    // Pixel mosaic over the Thread canvas, warmed up by a cyan/blue glow.
    backgroundColor: THREAD_BACKGROUND,
    backgroundImage: THREAD_BACKGROUND_IMAGE,
    backgroundSize: THREAD_BACKGROUND_SIZE,
    backgroundPosition: THREAD_BACKGROUND_POSITION,
    boxShadow: `inset 0 0 0 1px rgba(255, 255, 255, 0.1)`,
  },
  titleClassName: 'font-semibold text-white',
  descriptionClassName: 'text-sm text-white/70',
};

const THEMES: Record<FeatureVotingThemeName, FeatureVotingTheme> = {
  default: DEFAULT_THEME,
  thread: THREAD_THEME,
};

export const getFeatureVotingTheme = (
  theme: string | null | undefined
): FeatureVotingTheme =>
  THEMES[theme as FeatureVotingThemeName] ?? THEMES.default;
