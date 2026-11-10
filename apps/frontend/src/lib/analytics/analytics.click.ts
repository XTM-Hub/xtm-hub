import {
  ANALYTICS_EPIC_NAME_ATTRIBUTE,
  ANALYTICS_FEATURE_NAME_ATTRIBUTE,
  ANALYTICS_ID_ATTRIBUTE,
  ANALYTICS_LIBRARY_ATTRIBUTE,
  ANALYTICS_LINK_TYPE_ATTRIBUTE,
  ANALYTICS_LINK_TYPES,
  ANALYTICS_PRODUCT_ATTRIBUTE,
  ANALYTICS_RESOURCE_ID_ATTRIBUTE,
  ANALYTICS_RESOURCE_NAME_ATTRIBUTE,
  ANALYTICS_RESOURCE_TYPE_ATTRIBUTE,
  ANALYTICS_SECTION_ATTRIBUTE,
  ANALYTICS_USE_CASES_ATTRIBUTE,
  DISABLED_SELECTOR,
  INHERITED_DISABLED_SELECTOR,
  INTERACTIVE_SELECTOR,
  POPPER_CONTENT_WRAPPER_SELECTOR,
  PORTAL_CONTENT_SELECTOR,
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
import { toAnalyticsItem } from '@/lib/analytics/analytics.resource';
import {
  type AnalyticsEvents,
  type AnalyticsLinkType,
  type AnalyticsPageType,
} from '@/lib/analytics/analytics.types';
import { isValueInEnum } from '@/utils/is-value-in-enum';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';

const readAttribute = (
  element: Element | null,
  attribute: string
): string | undefined => element?.getAttribute(attribute)?.trim() || undefined;

const splitIdReferences = (value: string | null): string[] =>
  value?.split(/\s+/).filter(Boolean) ?? [];

const findPortalTrigger = (element: Element): Element | null => {
  const portal = element.closest(PORTAL_CONTENT_SELECTOR);
  const content = portal?.matches(POPPER_CONTENT_WRAPPER_SELECTOR)
    ? portal.firstElementChild
    : portal;
  if (!content) {
    return null;
  }
  const controller = content.id
    ? document.querySelector(`[aria-controls~="${content.id}"]`)
    : null;
  return (
    controller ??
    splitIdReferences(content.getAttribute('aria-labelledby'))
      .map((id) => document.getElementById(id))
      .find((label) => label !== null) ??
    null
  );
};

const getContextChain = (element: Element): Element[] => {
  const chain = [element];
  let trigger = findPortalTrigger(element);
  while (trigger && !chain.includes(trigger)) {
    chain.push(trigger);
    trigger = findPortalTrigger(trigger);
  }
  return chain;
};

const findContext = (chain: Element[], selector: string): Element | null => {
  for (const node of chain) {
    const context = node.closest(selector);
    if (context) {
      return context;
    }
  }
  return null;
};

const readClosestAttribute = (
  chain: Element[],
  attribute: string
): string | undefined =>
  readAttribute(findContext(chain, `[${attribute}]`), attribute);

const isAnalyticsLinkType = (
  value: string | undefined
): value is AnalyticsLinkType =>
  ANALYTICS_LINK_TYPES.some((type) => type === value);

const isSelectionControl = (element: Element): boolean =>
  element.matches(SELECTION_CONTROL_SELECTOR) &&
  !!element.closest(SELECTION_CONTAINER_SELECTOR);

interface TrackedElement {
  element: Element;
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
    ? { element, elementId }
    : null;
};

export const buildClickParams = (
  { element, elementId }: TrackedElement,
  pageType: AnalyticsPageType
): AnalyticsEvents['ui_click'] => {
  const { action }: AnalyticsElementDefinition =
    ANALYTICS_ELEMENT_IDS[elementId];
  const chain = getContextChain(element);
  const resource = findContext(chain, `[${ANALYTICS_RESOURCE_ID_ATTRIBUTE}]`);
  const linkType = readClosestAttribute(chain, ANALYTICS_LINK_TYPE_ATTRIBUTE);
  return {
    element_id: elementId,
    domain: getAnalyticsDomain(elementId),
    action,
    page_type: pageType,
    resource_id: readAttribute(resource, ANALYTICS_RESOURCE_ID_ATTRIBUTE),
    resource_name: readAttribute(resource, ANALYTICS_RESOURCE_NAME_ATTRIBUTE),
    library: readAttribute(resource, ANALYTICS_LIBRARY_ATTRIBUTE),
    use_cases: readAttribute(resource, ANALYTICS_USE_CASES_ATTRIBUTE),
    product: readClosestAttribute(chain, ANALYTICS_PRODUCT_ATTRIBUTE),
    section: readClosestAttribute(chain, ANALYTICS_SECTION_ATTRIBUTE),
    epic_name: readClosestAttribute(chain, ANALYTICS_EPIC_NAME_ATTRIBUTE),
    feature_name: readClosestAttribute(chain, ANALYTICS_FEATURE_NAME_ATTRIBUTE),
    link_type: isAnalyticsLinkType(linkType) ? linkType : undefined,
  };
};

export const buildSelectItemParams = (
  { element, elementId }: TrackedElement,
  pageType: AnalyticsPageType
): AnalyticsEvents['select_item'] | null => {
  if (elementId !== 'resource_open') {
    return null;
  }
  const resource = findContext(
    getContextChain(element),
    `[${ANALYTICS_RESOURCE_ID_ATTRIBUTE}]`
  );
  const id = readAttribute(resource, ANALYTICS_RESOURCE_ID_ATTRIBUTE);
  const type = readAttribute(resource, ANALYTICS_RESOURCE_TYPE_ATTRIBUTE);
  if (!id || !isValueInEnum(type, ShareableResourceType)) {
    return null;
  }
  const item = toAnalyticsItem(
    { id, name: readAttribute(resource, ANALYTICS_RESOURCE_NAME_ATTRIBUTE) },
    type
  );
  return {
    item_list_name: pageType === 'Library' ? item.item_category : pageType,
    items: [item],
  };
};
