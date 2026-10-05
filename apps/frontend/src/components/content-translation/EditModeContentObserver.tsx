'use client';

import { ContentEditDialog } from '@/components/content-translation/ContentEditDialog';
import { useEditMode } from '@/context/edit-mode-context';
import {
  containsContentKeyMarker,
  decodeContentKeyMarker,
} from '@/utils/content-translation/invisible-marker';
import { EditIcon } from '@filigran/icon';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Hydration <script> tags embed a serialized copy of the rendered HTML,
// markers included, which must never become editable.
const isNonRenderedTextNode = (node: Text) => {
  const parentTag = node.parentElement?.tagName;
  return parentTag === 'SCRIPT' || parentTag === 'STYLE';
};

interface MarkedTextEntry {
  contentKey: string;
}

class MarkedTextRegistry {
  private byNode = new WeakMap<Text, MarkedTextEntry>();
  private byParent = new WeakMap<Element, Text[]>();
  private allNodes = new Set<Text>();

  // The marker is stripped from the node data in place: replacing a node
  // React created makes its next reconciliation crash on removeChild.
  register(node: Text) {
    if (isNonRenderedTextNode(node)) {
      return;
    }
    const text = node.data;
    if (!containsContentKeyMarker(text)) {
      return;
    }
    const { cleanText, contentKey } = decodeContentKeyMarker(text);
    if (!contentKey) {
      return;
    }
    node.data = cleanText;

    this.byNode.set(node, { contentKey });
    this.allNodes.add(node);
    const parent = node.parentElement;
    if (parent) {
      const siblings = this.byParent.get(parent) ?? [];
      if (!siblings.includes(node)) {
        siblings.push(node);
        this.byParent.set(parent, siblings);
      }
    }
  }

  get(node: Text) {
    return this.byNode.get(node);
  }

  candidatesUnder(element: Element) {
    return this.byParent.get(element) ?? [];
  }

  // WeakMaps can't be iterated, so the set is kept too and pruned lazily
  // here, the only place it must be accurate.
  list(): { node: Text; contentKey: string }[] {
    const result: { node: Text; contentKey: string }[] = [];
    for (const node of this.allNodes) {
      if (!node.isConnected) {
        this.allNodes.delete(node);
        continue;
      }
      const entry = this.byNode.get(node);
      if (entry) {
        result.push({ node, contentKey: entry.contentKey });
      }
    }
    return result;
  }
}

// Collect first: mutating text mid-walk would disturb the walker.
const scanForMarkedTextNodes = (root: Node, registry: MarkedTextRegistry) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (candidate) => {
      if (isNonRenderedTextNode(candidate as Text)) {
        return NodeFilter.FILTER_REJECT;
      }
      return containsContentKeyMarker(candidate.textContent ?? '')
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_SKIP;
    },
  });
  const matches: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    matches.push(current as Text);
    current = walker.nextNode();
  }
  matches.forEach((node) => registry.register(node));
};

const INTERACTIVE_SELECTOR = [
  'a',
  'button',
  'input',
  'label',
  'select',
  'summary',
  'textarea',
  '[role="button"]',
  '[role="checkbox"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="switch"]',
  '[role="tab"]',
].join(', ');

const isPointInText = (node: Text, x: number, y: number) => {
  const range = document.createRange();
  range.selectNodeContents(node);
  return Array.from(range.getClientRects()).some(
    (rect) =>
      x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
  );
};

interface EditableTarget {
  element: Element;
  contentKey: string;
}

// Stops at an interactive element without an editable text of its own, so an
// icon-only button inside an editable block keeps its action.
const findEditableTarget = (
  x: number,
  y: number,
  registry: MarkedTextRegistry
): EditableTarget | null => {
  let element = document.elementFromPoint(x, y);
  let depth = 0;
  while (element && depth < 8) {
    const candidates = registry
      .candidatesUnder(element)
      .filter((node) => node.isConnected)
      .flatMap((node) => {
        const entry = registry.get(node);
        return entry ? [{ node, contentKey: entry.contentKey }] : [];
      });
    const match =
      candidates.find(({ node }) => isPointInText(node, x, y)) ?? candidates[0];
    if (match) {
      return { element, contentKey: match.contentKey };
    }
    if (element.matches(INTERACTIVE_SELECTOR)) {
      return null;
    }
    element = element.parentElement;
    depth += 1;
  }
  return null;
};

// An attribute rather than a class, which React rewrites on every render.
export const EDITABLE_ATTRIBUTE = 'data-content-editable';

const flagEditableElement = (
  node: Text,
  contentKey: string,
  overriddenKeys: Set<string>
) => {
  const element = node.parentElement;
  if (!element || element.getAttribute(EDITABLE_ATTRIBUTE) === 'overridden') {
    return;
  }
  element.setAttribute(
    EDITABLE_ATTRIBUTE,
    overriddenKeys.has(contentKey) ? 'overridden' : 'committed'
  );
};

const clearEditableElements = () => {
  document
    .querySelectorAll(`[${EDITABLE_ATTRIBUTE}]`)
    .forEach((element) => element.removeAttribute(EDITABLE_ATTRIBUTE));
};

export const EditModeContentObserver = () => {
  const { isEditMode, showEditableAreas, overriddenKeys } = useEditMode();
  const overriddenKeySet = useMemo(
    () => new Set(overriddenKeys),
    [overriddenKeys]
  );
  const router = useRouter();
  const [activeContentKey, setActiveContentKey] = useState<string | null>(null);
  const [badge, setBadge] = useState<{
    top: number;
    left: number;
    isOverridden: boolean;
  } | null>(null);
  const badgeRafRef = useRef<number | null>(null);
  const registryRef = useRef<MarkedTextRegistry | null>(null);
  if (registryRef.current === null) {
    registryRef.current = new MarkedTextRegistry();
  }

  useEffect(() => {
    if (!isEditMode) {
      return undefined;
    }

    const registry = registryRef.current!;
    scanForMarkedTextNodes(document.body, registry);

    const flagAll = () => {
      if (!showEditableAreas) {
        return;
      }
      registry
        .list()
        .forEach(({ node, contentKey }) =>
          flagEditableElement(node, contentKey, overriddenKeySet)
        );
    };
    flagAll();

    // Client-side navigations swap content without remounting the layout.
    // Attributes are not watched, so flagging elements never re-triggers it.
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((added) => {
          if (added.nodeType === Node.TEXT_NODE) {
            registry.register(added as Text);
          } else if (added.nodeType === Node.ELEMENT_NODE) {
            scanForMarkedTextNodes(added, registry);
          }
        });
        if (
          mutation.type === 'characterData' &&
          mutation.target.nodeType === Node.TEXT_NODE
        ) {
          registry.register(mutation.target as Text);
        }
      });
      flagAll();
    });
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    const handleClick = (event: MouseEvent) => {
      if (!showEditableAreas) {
        return;
      }
      const match = findEditableTarget(event.clientX, event.clientY, registry);
      if (!match) {
        return;
      }
      // Capture phase: stop the click before an interactive ancestor handles
      // it or follows a link.
      event.preventDefault();
      event.stopPropagation();
      setBadge(null);
      setActiveContentKey(match.contentKey);
    };

    // rAF-throttled: hit-testing walks the DOM.
    const handlePointerMove = (event: MouseEvent) => {
      if (!showEditableAreas || badgeRafRef.current !== null) {
        return;
      }
      const { clientX, clientY } = event;
      badgeRafRef.current = requestAnimationFrame(() => {
        badgeRafRef.current = null;
        const target = findEditableTarget(clientX, clientY, registry);
        if (!target) {
          setBadge(null);
          return;
        }
        const rect = target.element.getBoundingClientRect();
        setBadge({
          top: rect.top,
          left: rect.right,
          isOverridden:
            target.element.getAttribute(EDITABLE_ATTRIBUTE) === 'overridden',
        });
      });
    };
    // The badge is fixed-position: hide it on scroll rather than chase the
    // element.
    const hideBadge = () => setBadge(null);

    document.addEventListener('click', handleClick, true);
    document.addEventListener('mousemove', handlePointerMove);
    document.addEventListener('scroll', hideBadge, true);

    return () => {
      mutationObserver.disconnect();
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('mousemove', handlePointerMove);
      document.removeEventListener('scroll', hideBadge, true);
      if (badgeRafRef.current !== null) {
        cancelAnimationFrame(badgeRafRef.current);
        badgeRafRef.current = null;
      }
      setBadge(null);
      clearEditableElements();
    };
  }, [isEditMode, showEditableAreas, overriddenKeySet]);

  if (!isEditMode) {
    return null;
  }

  if (!activeContentKey) {
    return badge
      ? createPortal(
          <div
            data-content-edit-badge={
              badge.isOverridden ? 'overridden' : 'committed'
            }
            style={{ top: badge.top, left: badge.left }}
            className="pointer-events-none fixed z-[100] -translate-x-1/2 -translate-y-1/2">
            <EditIcon className="text-primary bg-elevation-background-layer-1 h-4 w-4 rounded-full p-0.5 shadow" />
          </div>,
          document.body
        )
      : null;
  }

  return (
    <ContentEditDialog
      contentKey={activeContentKey}
      open
      onOpenChange={(open) => {
        if (!open) {
          setActiveContentKey(null);
        }
      }}
      // Only a server render resolves the saved template's placeholders.
      onSaved={() => router.refresh()}
    />
  );
};
