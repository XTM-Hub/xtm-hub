import { SaasListTourDocumentation } from '@/components/subcription/saas/tour/SaasListTourDocumentation';
import { useTranslate } from '@/hooks/use-translate';
import { SaasPlatformOrdering } from '@graphql/generated';
import type { StepType } from '@reactour/tour';
import { createElement } from 'react';

// Each element the tour points at carries one of these values in its `data-tour` attribute.
export const SAAS_LIST_TOUR_TARGET = {
  List: 'saas-list',
  Search: 'saas-list-search',
  ProductFilter: 'saas-list-product-filter',
  TableOptions: 'saas-list-table-options',
  Documentation: 'saas-list-documentation',
} as const;

export type SaasListTourStep = StepType & {
  // Set on the list during the step. Written in full: Tailwind only generates the classes it finds in the source.
  listClassName?: string;
  // The columns the step points at: the tour shows them while it is open, even when the user hid them.
  columnIds?: string[];
};

type SaasListTourTarget =
  (typeof SAAS_LIST_TOUR_TARGET)[keyof typeof SAAS_LIST_TOUR_TARGET];

export const saasListTourTarget = (target: SaasListTourTarget) => ({
  'data-tour': target,
});

export const getSaasListTourColumnIds = (steps: SaasListTourStep[]) => [
  ...new Set(steps.flatMap((step) => step.columnIds ?? [])),
];

const selectTarget = (target: SaasListTourTarget) => `[data-tour="${target}"]`;

const LIST = selectTarget(SAAS_LIST_TOUR_TARGET.List);

// The steps on the table scroll to its headers; their highlighted area comes from their selectors.
const COLUMN_HEADERS = `${LIST} thead`;

// The table is taller than the screen: highlighting all its rows would scroll its headers away
// and cover the whole page, so the steps on the table highlight its first rows only.
export const HIGHLIGHTED_ROW_COUNT = 3;

const FIRST_ROWS = Array.from(
  { length: HIGHLIGHTED_ROW_COUNT },
  (_, index) => `${LIST} tbody tr:nth-child(${index + 1})`
);

const selectColumnHeader = (columnId: string) =>
  `${LIST} th[data-column-id="${columnId}"]`;

// The tour highlights one area: the box around the header and first cells of the columns.
// A hidden column or a missing row is skipped, and the columns in between are highlighted as well.
const selectColumns = (columnIds: string[]) =>
  columnIds.flatMap((columnId) => [
    selectColumnHeader(columnId),
    ...FIRST_ROWS.map((row) => `${row} td[data-column-id="${columnId}"]`),
  ]);

// Scrolls to the header of the column, which can be out of view on the right of the table.
const selectColumnStep = (
  columnId: string,
  content: string
): SaasListTourStep => ({
  selector: selectColumnHeader(columnId),
  highlightedSelectors: selectColumns([columnId]),
  columnIds: [columnId],
  content,
});

const HUB_COLUMN_IDS = ['organization', 'administrators', 'link'];
const HOVER_DETAILS_COLUMN_IDS = [
  'organization',
  'administrators',
  SaasPlatformOrdering.Product,
  SaasPlatformOrdering.EndDate,
];

export const getSaasListTourSteps = (
  t: ReturnType<typeof useTranslate>
): SaasListTourStep[] => [
  {
    selector: COLUMN_HEADERS,
    highlightedSelectors: [COLUMN_HEADERS, ...FIRST_ROWS],
    content: t('CSMBoard.Tour.Table'),
  },
  {
    selector: selectTarget(SAAS_LIST_TOUR_TARGET.Search),
    content: t('CSMBoard.Tour.Search'),
  },
  {
    selector: selectTarget(SAAS_LIST_TOUR_TARGET.ProductFilter),
    content: t('CSMBoard.Tour.ProductFilter'),
  },
  {
    selector: COLUMN_HEADERS,
    highlightedSelectors: selectColumns(HUB_COLUMN_IDS),
    columnIds: HUB_COLUMN_IDS,
    // The highlighted area spans the products and plan columns, which hold no data of the Hub.
    listClassName:
      '[&_[data-column-id=product]]:opacity-30 [&_[data-column-id=plan]]:opacity-30',
    content: t('CSMBoard.Tour.HubColumns', {
      viewMetrics: t('CSMBoard.ViewMetrics'),
    }),
  },
  {
    selector: COLUMN_HEADERS,
    highlightedSelectors: selectColumns(HOVER_DETAILS_COLUMN_IDS),
    columnIds: HOVER_DETAILS_COLUMN_IDS,
    // The highlighted area spans the plan and SaaS metrics columns, which show nothing more on hover.
    listClassName:
      '[&_[data-column-id=plan]]:opacity-30 [&_[data-column-id=link]]:opacity-30',
    content: t('CSMBoard.Tour.HoverDetails'),
  },
  selectColumnStep('link', t('CSMBoard.Tour.MetricsLink')),
  selectColumnStep('database', t('CSMBoard.Tour.Database')),
  selectColumnStep('file_storage', t('CSMBoard.Tour.FileStorage')),
  selectColumnStep('availability', t('CSMBoard.Tour.Availability')),
  selectColumnStep('health', t('CSMBoard.Tour.Health')),
  {
    // Its menu only shows when the header is hovered: the tour points at the whole header.
    selector: selectColumnHeader(SaasPlatformOrdering.CustomerName),
    columnIds: [SaasPlatformOrdering.CustomerName],
    content: t('CSMBoard.Tour.ColumnMenu'),
  },
  {
    selector: `${selectTarget(SAAS_LIST_TOUR_TARGET.TableOptions)} button[aria-haspopup="menu"]`,
    content: t('CSMBoard.Tour.ShowHiddenColumn', {
      columns: t('DesignSystem.DataTable.Columns'),
    }),
  },
  {
    selector: selectTarget(SAAS_LIST_TOUR_TARGET.Documentation),
    content: createElement(SaasListTourDocumentation),
  },
];
