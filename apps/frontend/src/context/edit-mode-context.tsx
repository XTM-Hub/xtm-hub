'use client';

import { createContext, ReactNode, useContext, useMemo } from 'react';
import { useLocalStorage } from 'usehooks-ts';

interface EditModeServerValue {
  canEditContent: boolean;
  isEditMode: boolean;
  pendingChangeCount: number;
  // With a draft or a published override, in any locale.
  overriddenKeys: string[];
}

interface EditModeContextValue extends EditModeServerValue {
  showEditableAreas: boolean;
  setShowEditableAreas: (showEditableAreas: boolean) => void;
}

const EditModeContext = createContext<EditModeContextValue>({
  canEditContent: false,
  isEditMode: false,
  pendingChangeCount: 0,
  overriddenKeys: [],
  showEditableAreas: false,
  setShowEditableAreas: () => {},
});

export const EditModeProvider = ({
  canEditContent,
  isEditMode,
  pendingChangeCount,
  overriddenKeys,
  children,
}: EditModeServerValue & { children: ReactNode }) => {
  const [showEditableAreas, setShowEditableAreas] = useLocalStorage<boolean>(
    'is-content-edit-areas-shown',
    true,
    { initializeWithValue: false }
  );
  const value = useMemo(
    () => ({
      canEditContent,
      isEditMode,
      pendingChangeCount,
      overriddenKeys,
      showEditableAreas,
      setShowEditableAreas,
    }),
    [
      canEditContent,
      isEditMode,
      pendingChangeCount,
      overriddenKeys,
      showEditableAreas,
      setShowEditableAreas,
    ]
  );

  return (
    <EditModeContext.Provider value={value}>
      {children}
    </EditModeContext.Provider>
  );
};

export const useEditMode = () => useContext(EditModeContext);
