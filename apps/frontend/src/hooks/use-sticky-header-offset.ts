import { RefObject, useEffect } from 'react';

/**
 * Publishes two CSS variables on the sticky list header's parent so the
 * sibling FilterSidebar can position and size itself against the real
 * geometry instead of hardcoded heights:
 * - --list-header-height: the header's own height (it wraps to two lines
 *   on narrow viewports, so this varies with viewport/i18n/content);
 * - --list-scroll-height: the visible height of the enclosing scroll
 *   container (the app shell scrolls in an inner <main>, not on body,
 *   so 100vh/100dvh over-measure the available space).
 */
export const useStickyHeaderOffset = (
  headerRef: RefObject<HTMLElement | null>
) => {
  useEffect(() => {
    const el = headerRef.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;

    const scrollContainer = el.closest('main');

    const publish = () => {
      parent.style.setProperty('--list-header-height', `${el.offsetHeight}px`);
      if (scrollContainer) {
        parent.style.setProperty(
          '--list-scroll-height',
          `${scrollContainer.clientHeight}px`
        );
      }
    };

    const observer = new ResizeObserver(publish);
    observer.observe(el);
    if (scrollContainer) {
      observer.observe(scrollContainer);
    }
    publish();

    return () => observer.disconnect();
  }, [headerRef]);
};
