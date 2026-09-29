'use client';

import setContentEditModeAction from '@/utils/actions/content-edit-mode.actions';
import { useRouter } from 'next/navigation';
import { useCallback, useTransition } from 'react';

// Edit mode is resolved on the server, so the route re-renders once the
// cookie changed: markers appear (or vanish) on every string at once.
export const useContentEditModeToggle = () => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const setEditMode = useCallback(
    (isEnabled: boolean) =>
      startTransition(async () => {
        await setContentEditModeAction(isEnabled);
        router.refresh();
      }),
    [router]
  );

  return { setEditMode, isPending };
};
