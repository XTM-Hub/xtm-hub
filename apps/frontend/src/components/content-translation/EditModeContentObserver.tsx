'use client';

import { ContentEditDialog } from '@/components/content-translation/ContentEditDialog';
import { useEditMode } from '@/context/edit-mode-context';
import { cn } from '@/lib/utils';
import {
  containsContentKeyMarker,
  decodeContentKeyMarker,
} from '@/utils/content-translation/invisible-marker';
import { EditIcon } from '@filigran/icon';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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

  // Every still-connected marked node with its content key — used to
  // highlight every editable region on screen at once (rather than only
  // the one under the cursor). Nodes React has since removed from the
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

// Finds the exact marked Text node (if any) under viewport point (x, y),
// along with the specific line rect the point falls in — a Range can span
// several client rects when its text wraps across lines. Walks up from
// the deepest element at that point (rather than relying on the
// non-standard/inconsistent caretRangeFromPoint/caretPositionFromPoint
// APIs) so multiple marked text nodes sharing one parent element are
// disambiguated by an actual point-in-rect test, not by proximity alone.
const findMarkedTextAtPoint = (
  x: number,
  y: number,
  registry: MarkedTextRegistry
): { node: Text; contentKey: string; rect: DOMRect } | null => {
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
          return { node, contentKey: entry.contentKey, rect };
        }
      }
    }
    element = element.parentElement;
    depth += 1;
  }
  return null;
};

// Every visible rect (one per wrapped line) for every currently-registered
// marked node — used to reveal all editable regions on screen at once,
// rather than only the one under the cursor, which was otherwise impossible
// to discover without blindly hovering.
const getAllTargetRects = (registry: MarkedTextRegistry): EditableRegion[] => {
  const regions: EditableRegion[] = [];
  registry.list().forEach(({ node, contentKey }) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    Array.from(range.getClientRects()).forEach((rect) => {
      // Empty/collapsed text nodes (whitespace-only, or momentarily
      // mid-render) produce zero-size rects — not worth drawing a box
      // around.
      if (rect.width > 0 && rect.height > 0) {
        regions.push({ node, contentKey, rect });
      }
    });
  });
  return regions;
};

interface EditableRegion {
  node: Text;
  contentKey: string;
  rect: DOMRect;
}

type HoverTarget = EditableRegion;

// Mounted once per root layout while edit mode is on: scans the DOM for
// invisible content-key markers left by useTranslate() and registers each
// marked Text node's live instance (stripping the marker from its data in
// place, never replacing the node itself — see MarkedTextRegistry.register
// for why that distinction matters). While the editable areas are shown
// (toggled from EditionModeBanner), every editable region is outlined,
// hovering highlights the one under the cursor (a portal, positioned via
// getBoundingClientRect — it never touches the underlying DOM/React tree
// either), and a click opens the edit dialog for it. See with-content-key-markers.ts for how markers get
// embedded, and invisible-marker.ts for the encoding scheme.
export const EditModeContentObserver = () => {
  const { isEditMode, showEditableAreas, overriddenKeys } = useEditMode();
  // Texts rendered from a draft or a published override are outlined in
  // yellow, to tell them apart from the committed messages.
  const overriddenKeySet = useMemo(
    () => new Set(overriddenKeys),
    [overriddenKeys]
  );
  const [hoverTarget, setHoverTarget] = useState<HoverTarget | null>(null);
  const router = useRouter();
  const [activeContentKey, setActiveContentKey] = useState<string | null>(null);
  // Every editable region currently on screen, shown as a dim outline while
  // the editable areas are shown.
  const [allTargets, setAllTargets] = useState<EditableRegion[]>([]);
  const registryRef = useRef<MarkedTextRegistry | null>(null);
  if (registryRef.current === null) {
    registryRef.current = new MarkedTextRegistry();
  }
  const rafRef = useRef<number | null>(null);
  const allTargetsRafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isEditMode) {
      return undefined;
    }

    const registry = registryRef.current!;
    scanForMarkedTextNodes(document.body, registry);

    const clearHover = () => setHoverTarget(null);

    // rAF-throttled for the same reason as the pointer-move handler below
    // — recomputing every registered node's rects on every scroll/resize
    // tick would be wasteful.
    const refreshAllTargets = () => {
      if (allTargetsRafRef.current !== null) {
        return;
      }
      allTargetsRafRef.current = requestAnimationFrame(() => {
        allTargetsRafRef.current = null;
        setAllTargets(getAllTargetRects(registry));
      });
    };

    // Next.js App Router client-side navigations swap page content under
    // the same persistent root layout without remounting it, so a live
    // observer (not just the initial scan above) is needed to catch
    // newly-rendered marked text.
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
      if (showEditableAreas) {
        refreshAllTargets();
      }
    });
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // rAF-throttled: hit-testing runs a DOM walk + Range measurement, so
    // this avoids doing that work more than once per frame during a fast
    // mouse movement.
    const handlePointerMove = (event: MouseEvent) => {
      if (!showEditableAreas || rafRef.current !== null) {
        return;
      }
      const { clientX, clientY } = event;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        setHoverTarget(findMarkedTextAtPoint(clientX, clientY, registry));
      });
    };

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
      setHoverTarget(null);
    };

    const handleViewportChange = () => {
      clearHover();
      if (showEditableAreas) {
        refreshAllTargets();
      }
    };

    document.addEventListener('mousemove', handlePointerMove);
    document.addEventListener('scroll', handleViewportChange, true);
    window.addEventListener('resize', handleViewportChange);
    document.addEventListener('click', handleClick, true);
    if (showEditableAreas) {
      refreshAllTargets();
    }

    return () => {
      mutationObserver.disconnect();
      document.removeEventListener('mousemove', handlePointerMove);
      document.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('resize', handleViewportChange);
      document.removeEventListener('click', handleClick, true);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (allTargetsRafRef.current !== null) {
        cancelAnimationFrame(allTargetsRafRef.current);
        allTargetsRafRef.current = null;
      }
      setHoverTarget(null);
      setAllTargets([]);
    };
  }, [isEditMode, showEditableAreas]);

  if (!isEditMode) {
    return null;
  }

  return (
    <>
      {allTargets.length > 0 &&
        !activeContentKey &&
        createPortal(
          <>
            {allTargets.map((target, index) => (
              <div
                // Text nodes don't have a stable id of their own, and the
                // same node can produce several rects (wrapped lines) —
                // node identity + rect index together are unique enough
                // for a list that's only ever fully replaced, never
                // reordered in place.
                key={index}
                style={{
                  position: 'fixed',
                  top: target.rect.top,
                  left: target.rect.left,
                  width: target.rect.width,
                  height: target.rect.height,
                }}
                className={cn(
                  'pointer-events-none z-[99] rounded-xs outline-1 outline-dashed',
                  overriddenKeySet.has(target.contentKey)
                    ? 'outline-yellow-400'
                    : 'outline-primary/50'
                )}
              />
            ))}
          </>,
          document.body
        )}
      {hoverTarget &&
        !activeContentKey &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: hoverTarget.rect.top,
              left: hoverTarget.rect.left,
              width: hoverTarget.rect.width,
              height: hoverTarget.rect.height,
            }}
            className={cn(
              'pointer-events-none z-[100] rounded-xs outline-1 outline-dashed',
              overriddenKeySet.has(hoverTarget.contentKey)
                ? 'outline-yellow-400 bg-yellow-100/30'
                : 'outline-primary bg-blue-50/40'
            )}>
            <EditIcon className="text-primary bg-elevation-background-layer-1 absolute -top-2 -right-2 h-4 w-4 rounded-full p-0.5 shadow" />
          </div>,
          document.body
        )}
      {activeContentKey && (
        <ContentEditDialog
          contentKey={activeContentKey}
          open
          onOpenChange={(open) => {
            if (!open) {
              setActiveContentKey(null);
            }
          }}
          // Re-render from the server rather than writing the saved value
          // into the DOM: the value is a message template, and only a render
          // resolves its placeholders (and updates every other occurrence).
          onSaved={() => router.refresh()}
        />
      )}
    </>
  );
};
