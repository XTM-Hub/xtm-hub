import { useState } from 'react';

// Opens the item when it becomes the active one, then leaves the user free to close it.
// Radix reads the empty string as "every item closed".
export const useActiveAccordionItem = (activeKey?: string) => {
  const [openKey, setOpenKey] = useState(activeKey ?? '');
  const [previousActiveKey, setPreviousActiveKey] = useState(activeKey);

  if (activeKey !== previousActiveKey) {
    setPreviousActiveKey(activeKey);
    if (activeKey) {
      setOpenKey(activeKey);
    }
  }

  return [openKey, setOpenKey] as const;
};
