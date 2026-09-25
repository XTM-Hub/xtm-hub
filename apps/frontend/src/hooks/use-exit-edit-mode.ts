'use client';

import { useEditMode } from '@/context/edit-mode-context';
import { useContentEditModeToggle } from '@/hooks/use-content-edit-mode-toggle';
import { useCallback, useState } from 'react';

// Leaving edit mode with unpublished drafts asks what to do with them first
// (see ExitEditModeDialog); otherwise it leaves right away.
export const useExitEditMode = () => {
  const { pendingChangeCount } = useEditMode();
  const { setEditMode, isPending } = useContentEditModeToggle();
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);

  const exitEditMode = useCallback(() => {
    if (pendingChangeCount > 0) {
      setIsExitDialogOpen(true);
      return;
    }
    setEditMode(false);
  }, [pendingChangeCount, setEditMode]);

  return {
    exitEditMode,
    isPending,
    exitDialogProps: {
      open: isExitDialogOpen,
      onOpenChange: setIsExitDialogOpen,
    },
  };
};
