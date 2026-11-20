import { ClearAllFiltersButton } from '@/components/service/components/header/filter/ClearAllFiltersButton';
import { ServiceListFilterSection } from '@/components/service/components/header/filter/ServiceListFilterSection';
import { ServiceListFilterMap } from '@/components/service/components/header/ServiceListHeader';
import { useServiceListStorageKeyContext } from '@/components/service/components/ServiceListStorageKeyContext';
import { useServiceListStorage } from '@/hooks/use-service-list-storage';
import { useTranslate } from '@/hooks/use-translate';
import { Text } from '@filigran/design-system';
import { useRef } from 'react';
import { useIsClient } from 'usehooks-ts';

interface FilterSidebarProps {
  filters: ServiceListFilterMap;
}

/**
 * Sticky filter column shared by the public and private document lists.
 * Hidden below `sm`, where the list header's FilterSheet takes over.
 * A fixed 250px flex column: `basis-[250px]` with growth and shrink both
 * disabled, so the sidebar never scales with the viewport and the sibling
 * content column absorbs every width change on its own. The width is an
 * arbitrary value on purpose — `basis-250` would resolve against the
 * spacing scale (`--spacing: 0.25rem`), not to pixels.
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
export const FilterSidebar = ({ filters }: FilterSidebarProps) => {
  const t = useTranslate();
  const { storageKey } = useServiceListStorageKeyContext();
  const { hasActiveFilters, clearFilters } = useServiceListStorage(storageKey);
  const isClient = useIsClient();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const handleClearAll = () => {
    clearFilters();
    // The clicked button unmounts: keep the focus inside the sidebar.
    headingRef.current?.focus();
  };

  return (
    <div className="shrink-0 grow-0 basis-[250px] self-start sticky top-[var(--list-header-height,64px)] max-h-[calc(var(--list-scroll-height,100dvh)-var(--list-header-height,64px))] overflow-y-auto rounded p-3 layer-1 bg-elevation-default max-sm:hidden">
      <div className="flex min-h-8 items-center justify-between px-2 pb-1">
        <Text
          ref={headingRef}
          as="h2"
          variant="title-sm"
          tabIndex={-1}>
          {t('Service.List.Filters')}
        </Text>
        {/* The server cannot read the stored filters: render the button after mount. */}
        {isClient && hasActiveFilters && (
          <ClearAllFiltersButton onClick={handleClearAll} />
        )}
      </div>
      <ServiceListFilterSection filters={filters} />
    </div>
  );
};
