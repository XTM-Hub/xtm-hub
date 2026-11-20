import { expect } from 'vitest';

/**
 * Asserts that `surface` is a design system Paper surface at the default
 * elevation and 16px padding, with `title` rendered in the Paper header above
 * it (inside the Paper wrapper, outside the surface).
 *
 * The surface classes pin the design system's class names on purpose, as jsdom
 * does no layout: a rename in the design system needs this helper updated.
 */
export const expectPaperWithTitleAbove = (
  surface: HTMLElement | null,
  title: HTMLElement
): void => {
  expect(surface).toHaveClass('rounded-sm', 'p-4', 'layer-1');
  expect(surface).not.toContainElement(title);
  expect(surface?.parentElement).toContainElement(title);
};
