// True when the text of the element overflows its box, so its end is cut off.
export const isTruncated = (element: HTMLElement | null): boolean =>
  !!element && element.scrollWidth > element.clientWidth;
