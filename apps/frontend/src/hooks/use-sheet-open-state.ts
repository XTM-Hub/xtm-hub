import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Open state of a sheet that notifies its parent when it closes.
 * `onClose` runs once per open-to-closed transition, however many closes follow.
 */
export const useSheetOpenState = (
  initialOpen: boolean,
  onClose?: () => void
): [boolean, (open: boolean) => void] => {
  const [openSheet, setOpenSheet] = useState(initialOpen);
  // Shared by every closure, so a repeated or late close notifies once.
  const openSheetRef = useRef(initialOpen);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const handleOpenSheet = useCallback((open: boolean) => {
    if (openSheetRef.current && !open) {
      onCloseRef.current?.();
    }
    openSheetRef.current = open;
    setOpenSheet(open);
  }, []);

  return [openSheet, handleOpenSheet];
};
