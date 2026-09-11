import { ServiceListFilterSection } from '@/components/service/components/header/filter/ServiceListFilterSection';
import { ServiceListFilterMap } from '@/components/service/components/header/ServiceListHeader';

interface FilterSidebarProps {
  filters: ServiceListFilterMap;
}

/**
 * Sticky filter column shared by the public and private document lists.
 * A fixed 250px flex column: `basis-[250px]` with growth and shrink both
 * disabled, so the sidebar never scales with the viewport and the sibling
 * content column absorbs every width change on its own. The width is an
 * arbitrary value on purpose — `basis-250` would resolve against the
 * spacing scale (`--spacing-100: 0.25rem`), not to pixels.
 * `self-start` opts out of the flex parent's default stretch so `sticky`
 * has room to operate. Both the top offset and the max height track the
 * real geometry via CSS variables published by useStickyHeaderOffset:
 * the list header wraps to two lines on narrow viewports, and the app
 * shell scrolls in an inner <main> smaller than the viewport, so any
 * hardcoded top/100vh would be wrong on some pages. The max-height +
 * inner scroll keep the last accordion reachable even when the expanded
 * sidebar is taller than the page content. Fallbacks cover the first
 * paint before the observer publishes.
 */
export const FilterSidebar = ({ filters }: FilterSidebarProps) => (
  <div className="shrink-0 grow-0 basis-[250px] self-start sticky top-[var(--list-header-height,64px)] max-h-[calc(var(--list-scroll-height,100dvh)-var(--list-header-height,64px))] overflow-y-auto rounded p-m bg-elevation-background-layer-1">
    <ServiceListFilterSection filters={filters} />
  </div>
);
