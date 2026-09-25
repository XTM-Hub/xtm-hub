'use client';

import { createContext, ReactNode, useContext, useMemo } from 'react';
import { useLocalStorage } from 'usehooks-ts';

interface EditModeServerValue {
  // Whether the current user may turn edit mode on (BYPASS capability).
  canEditContent: boolean;
  isEditMode: boolean;
  // Texts edited as drafts, not yet visible to visitors.
  pendingChangeCount: number;
  // Content keys with a draft or a published override, in any locale.
  overriddenKeys: string[];
}

interface EditModeContextValue extends EditModeServerValue {
  // Editable texts are outlined and a click on one opens its edit dialog.
  showEditableAreas: boolean;
  setShowEditableAreas: (showEditableAreas: boolean) => void;
}

// Outside any provider, content is simply never editable.
const EditModeContext = createContext<EditModeContextValue>({
  canEditContent: false,
  isEditMode: false,
  pendingChangeCount: 0,
  overriddenKeys: [],
  showEditableAreas: false,
  setShowEditableAreas: () => {},
});

// Mounted once per root layout (public + private). The layout resolves the
// server values (see content-edit-mode.server.ts), so they are final on
// the very first render: no hydration-time flip that would re-run effects.
export const EditModeProvider = ({
  canEditContent,
  isEditMode,
  pendingChangeCount,
  overriddenKeys,
  children,
}: EditModeServerValue & { children: ReactNode }) => {
  // A per-viewer preference, kept across page loads. Shown by default:
  // turning edit mode on is meant to edit.
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
