import { toUrlOrigin } from '@/utils/external-url';
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
  const [isTabOpen, setIsTabOpen] = useState(false);
  const beforeUnloadHandler = (event: BeforeUnloadEvent) => {
    event.preventDefault();
    return null;
  };
  const openTab = useCallback(() => {
    setIsTabOpen(true);
    tabRef.current = window.open(url, tabName);
  }, [url, tabName]);

  const closeTab = useCallback(() => {
    tabRef.current?.close();
    tabRef.current = null;
    setIsTabOpen(false);
  }, []);

  const focusTab = useCallback(() => {
    tabRef.current?.focus();
  }, []);

  // The opened tab is only talked to, and listened to, on the origin of its URL.
  const tabOrigin = toUrlOrigin(url);

  const postMessage = (message: Record<string, unknown>) => {
    if (tabOrigin) {
      tabRef.current?.postMessage(message, tabOrigin);
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        event.source === tabRef.current &&
        event.origin === tabOrigin &&
        onMessage
      ) {
        onMessage(event);
      }
    };
    if (isTabOpen) {
      window.addEventListener('message', handleMessage);
      if (preventUnload) {
        window.addEventListener('beforeunload', beforeUnloadHandler);
      }
      const checkInterval = setInterval(() => {
        if (tabRef.current?.closed) {
          if (onClosingTab) {
            onClosingTab();
          }
          closeTab();
          clearInterval(checkInterval);
        }
      }, 500);
    }

    return () => {
      window.removeEventListener('message', handleMessage);

      if (preventUnload) {
        window.removeEventListener('beforeunload', beforeUnloadHandler);
      }
    };
  }, [isTabOpen, closeTab, onClosingTab, onMessage, preventUnload, tabOrigin]);

  return {
    isTabOpen,
    openTab,
    closeTab,
    focusTab,
    postMessage,
  };
};

export default useExternalTab;
