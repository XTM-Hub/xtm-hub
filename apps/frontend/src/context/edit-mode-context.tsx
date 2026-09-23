'use client';

import { createContext, ReactNode, useContext, useMemo } from 'react';

interface EditModeContextValue {
  isEditMode: boolean;
}

// Outside any provider, content is simply never editable.
const EditModeContext = createContext<EditModeContextValue>({
  isEditMode: false,
});

// Mounted once per root layout (public + private). The layout resolves edit
// mode on the server (see isContentEditModeActive), so it is final on the
// very first render: no hydration-time flip that would re-run effects.
export const EditModeProvider = ({
  isEditMode,
  children,
}: {
  isEditMode: boolean;
  children: ReactNode;
}) => {
  const value = useMemo(() => ({ isEditMode }), [isEditMode]);

  return (
    <EditModeContext.Provider value={value}>
      {children}
    </EditModeContext.Provider>
  );
};

export const useEditMode = () => useContext(EditModeContext);
