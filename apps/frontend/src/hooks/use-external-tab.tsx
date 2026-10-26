import { getUrlOrigin } from '@/utils/external-url';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseExternalTabProps {
  url: string;
  tabName: string;
  onMessage?: (event: MessageEvent) => void;
  onClosingTab?: () => void;
  preventUnload: boolean;
}

interface UseExternalTabReturn {
  isTabOpen: boolean;
  openTab: () => void;
  closeTab: () => void;
  focusTab: () => void;
  postMessage: (message: Record<string, unknown>) => void;
}

const useExternalTab = ({
  url,
  tabName,
  onMessage,
  onClosingTab,
  preventUnload,
}: UseExternalTabProps): UseExternalTabReturn => {
  const tabRef = useRef<WindowProxy | null>(null);
  const tabOriginRef = useRef<string | null>(null);
  const [isTabOpen, setIsTabOpen] = useState(false);
  const beforeUnloadHandler = (event: BeforeUnloadEvent) => {
    event.preventDefault();
    return null;
  };
  const openTab = useCallback(() => {
    const tab = window.open(url, tabName);
    // The browser blocked the tab: there is nothing to watch or to message.
    if (!tab) {
      return;
    }
    tabRef.current = tab;
    tabOriginRef.current = getUrlOrigin(url);
    setIsTabOpen(true);
  }, [url, tabName]);

  const closeTab = useCallback(() => {
    tabRef.current?.close();
    tabRef.current = null;
    tabOriginRef.current = null;
    setIsTabOpen(false);
  }, []);

  const focusTab = useCallback(() => {
    tabRef.current?.focus();
  }, []);

  const postMessage = useCallback((message: Record<string, unknown>) => {
    if (!tabOriginRef.current) {
      return;
    }
    tabRef.current?.postMessage(message, tabOriginRef.current);
  }, []);

  // Refs, so that new callbacks on each render of the caller do not re-subscribe the listeners.
  const onMessageRef = useRef(onMessage);
  const onClosingTabRef = useRef(onClosingTab);
  useEffect(() => {
    onMessageRef.current = onMessage;
    onClosingTabRef.current = onClosingTab;
  }, [onMessage, onClosingTab]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!tabRef.current || event.source !== tabRef.current) {
        return;
      }
      // The tab may have been redirected (http to https, another host name): answer the origin it writes from.
      const origin = getUrlOrigin(event.origin);
      if (!origin) {
        return;
      }
      tabOriginRef.current = origin;
      onMessageRef.current?.(event);
    };
    let checkInterval: ReturnType<typeof setInterval> | undefined;
    if (isTabOpen) {
      window.addEventListener('message', handleMessage);
      if (preventUnload) {
        window.addEventListener('beforeunload', beforeUnloadHandler);
      }
      checkInterval = setInterval(() => {
        if (tabRef.current?.closed) {
          onClosingTabRef.current?.();
          closeTab();
          clearInterval(checkInterval);
        }
      }, 500);
    }

    return () => {
      clearInterval(checkInterval);
      window.removeEventListener('message', handleMessage);

      if (preventUnload) {
        window.removeEventListener('beforeunload', beforeUnloadHandler);
      }
    };
  }, [isTabOpen, closeTab, preventUnload]);

  return {
    isTabOpen,
    openTab,
    closeTab,
    focusTab,
    postMessage,
  };
};

export default useExternalTab;
