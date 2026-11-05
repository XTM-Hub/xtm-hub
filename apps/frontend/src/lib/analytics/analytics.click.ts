import {
  ANALYTICS_ID_ATTRIBUTE,
  DISABLED_SELECTOR,
  INHERITED_DISABLED_SELECTOR,
  INTERACTIVE_SELECTOR,
  SELECTION_CONTAINER_SELECTOR,
  SELECTION_CONTROL_SELECTOR,
} from '@/lib/analytics/analytics.consts';
import {
  type AnalyticsElementDefinition,
  type AnalyticsElementId,
  getAnalyticsDomain,
  isAnalyticsElementId,
} from '@/lib/analytics/analytics.ids';
import { ANALYTICS_ELEMENT_IDS } from '@/lib/analytics/analytics.registry';
import {
  type AnalyticsEvents,
  type AnalyticsPageType,
} from '@/lib/analytics/analytics.types';

const readAttribute = (
  element: Element | null,
  attribute: string
): string | undefined => element?.getAttribute(attribute)?.trim() || undefined;

const isSelectionControl = (element: Element): boolean =>
  element.matches(SELECTION_CONTROL_SELECTOR) &&
  !!element.closest(SELECTION_CONTAINER_SELECTOR);

interface TrackedElement {
  elementId: AnalyticsElementId;
}

export const findTrackedElement = (
  target: EventTarget | null
): TrackedElement | null => {
  const element =
    target instanceof Element ? target.closest(INTERACTIVE_SELECTOR) : null;
  const elementId = readAttribute(element, ANALYTICS_ID_ATTRIBUTE);
  return element &&
    elementId &&
    isAnalyticsElementId(elementId) &&
    !isSelectionControl(element) &&
    !element.matches(DISABLED_SELECTOR) &&
    !element.closest(INHERITED_DISABLED_SELECTOR)
    ? { elementId }
    : null;
};

export const buildClickParams = (
  { elementId }: TrackedElement,
  pageType: AnalyticsPageType
): AnalyticsEvents['ui_click'] => {
  const { action }: AnalyticsElementDefinition =
    ANALYTICS_ELEMENT_IDS[elementId];
  return {
    element_id: elementId,
    domain: getAnalyticsDomain(elementId),
    action,
    page_type: pageType,
  };
};
