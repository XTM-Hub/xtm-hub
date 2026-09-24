'use client';

import { ContentEditDialog } from '@/components/content-translation/ContentEditDialog';
import { useEditMode } from '@/context/edit-mode-context';
import {
  containsContentKeyMarker,
  decodeContentKeyMarker,
} from '@/utils/content-translation/invisible-marker';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

// Text nodes whose parent isn't actually rendered (e.g. Next.js's inline
// hydration <script> tags, which embed a serialized copy of the rendered
// HTML — invisible markers included) must never be treated as editable
// content, whether reached via the TreeWalker or the MutationObserver.
const isNonRenderedTextNode = (node: Text) => {
  const parentTag = node.parentElement?.tagName;
  return parentTag === 'SCRIPT' || parentTag === 'STYLE';
};

interface MarkedTextEntry {
  contentKey: string;
}

// Registry populated by scanning/observing the DOM: which live Text node
// instances carry a decoded content key, keyed both by the node itself
// (for O(1) lookup once a candidate node is found) and by that node's
// parent element (to find candidate nodes under the cursor without
// walking the whole document on every mousemove). The WeakMaps are
// garbage-collected for free once React discards a node; `allNodes` is a
// plain Set (needed to enumerate everything editable at once — see
// list() below) and is pruned lazily instead, since WeakMaps can't be
// iterated.
class MarkedTextRegistry {
  private byNode = new WeakMap<Text, MarkedTextEntry>();
  private byParent = new WeakMap<Element, Text[]>();
  private allNodes = new Set<Text>();

  // Strips the invisible marker from a text node's own data **in place**
  // (a plain content assignment, not a node swap), then registers it.
  // Mutating `.data`/`.textContent` on the exact Text node instance React
  // created never disturbs the parent/child relationships React's fiber
  // tree relies on — unlike `node.replaceWith()`, which detaches the node
  // React still references and later crashes with
  // "Failed to execute 'removeChild': the node ... is not a child of this
  // node" the next time React tries to reconcile that spot.
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

  // Every still-connected marked node with its content key — used to flag
  // every editable element at once. Nodes React has since removed from the
  // document are pruned here rather than tracked separately, since that's
  // the only time this list actually needs to be accurate.
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

// Two-pass scan (collect then register) so mutating text mid-walk never
// disturbs the TreeWalker itself.
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

// Finds the exact marked Text node (if any) under viewport point (x, y).
// Walks up from the deepest element at that point (rather than relying on
// the non-standard/inconsistent caretRangeFromPoint/caretPositionFromPoint
// APIs) so multiple marked text nodes sharing one parent element are
// disambiguated by an actual point-in-rect test — a Range can span several
// client rects when its text wraps across lines.
const findMarkedTextAtPoint = (
  x: number,
  y: number,
  registry: MarkedTextRegistry
): { node: Text; contentKey: string } | null => {
  let element = document.elementFromPoint(x, y);
  let depth = 0;
  while (element && depth < 8) {
    for (const node of registry.candidatesUnder(element)) {
      const entry = registry.get(node);
      if (!entry) {
        continue;
      }
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of Array.from(range.getClientRects())) {
        if (
          x >= rect.left &&
          x <= rect.right &&
          y >= rect.top &&
          y <= rect.bottom
        ) {
          return { node, contentKey: entry.contentKey };
        }
      }
    }
    element = element.parentElement;
    depth += 1;
  }
  return null;
};

// Set on the element holding an editable text and styled in globals.css:
// the browser draws the outline with the element itself, so it scrolls,
// clips and hides with it, and an outline never changes the layout. An
// attribute rather than a class, which React rewrites on every render.
export const EDITABLE_ATTRIBUTE = 'data-content-editable';

const flagEditableElement = (
  node: Text,
  contentKey: string,
  overriddenKeys: Set<string>
) => {
  const element = node.parentElement;
  // One overridden text is enough to flag an element holding several.
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

// Mounted once per root layout while edit mode is on: scans the DOM for
// invisible content-key markers left by useTranslate() and registers each
// marked Text node's live instance (stripping the marker from its data in
// place, never replacing the node itself — see MarkedTextRegistry.register
// for why that distinction matters). While the editable areas are shown
// (toggled from EditionModeBanner), the element holding each marked text is
// flagged for its outline, yellow when the text has a draft or a published
// override in any locale, and a click on the text opens its edit dialog.
// See with-content-key-markers.ts for how markers get embedded, and
// invisible-marker.ts for the encoding scheme.
export const EditModeContentObserver = () => {
  const { isEditMode, showEditableAreas, overriddenKeys } = useEditMode();
  const overriddenKeySet = useMemo(
    () => new Set(overriddenKeys),
    [overriddenKeys]
  );
  const router = useRouter();
  const [activeContentKey, setActiveContentKey] = useState<string | null>(null);
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

    // Next.js App Router client-side navigations swap page content under
    // the same persistent root layout without remounting it, so a live
    // observer (not just the initial scan above) is needed to catch
    // newly-rendered marked text. It only watches text and children, so
    // flagging elements through an attribute never triggers it again.
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

    // Only a click on an editable text, while the areas are shown, is
    // intercepted: anything else on the page keeps working as usual.
    const handleClick = (event: MouseEvent) => {
      if (!showEditableAreas) {
        return;
      }
      const match = findMarkedTextAtPoint(
        event.clientX,
        event.clientY,
        registry
      );
      if (!match) {
        return;
      }
      // The marked text can sit inside an interactive ancestor (button,
      // link, ...). Registering this listener on the capture phase and
      // stopping it here — before the event reaches that ancestor's own
      // handlers or triggers native defaults like link navigation —
      // ensures only the edit dialog opens.
      event.preventDefault();
      event.stopPropagation();
      setActiveContentKey(match.contentKey);
    };
    document.addEventListener('click', handleClick, true);

    return () => {
      mutationObserver.disconnect();
      document.removeEventListener('click', handleClick, true);
      clearEditableElements();
    };
  }, [isEditMode, showEditableAreas, overriddenKeySet]);

  if (!isEditMode || !activeContentKey) {
    return null;
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
      // Re-render from the server rather than writing the saved value into
      // the DOM: the value is a message template, and only a render resolves
      // its placeholders (and updates every other occurrence).
      onSaved={() => router.refresh()}
    />
  );
};
