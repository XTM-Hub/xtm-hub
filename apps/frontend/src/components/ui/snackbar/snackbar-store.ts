'use client';

import type { SnackbarProps } from '@filigran/design-system';
import { useSyncExternalStore } from 'react';

export type SnackbarMessage = Pick<
  SnackbarProps,
  'severity' | 'title' | 'description'
>;

interface StoredSnackbar extends SnackbarMessage {
  id: number;
  open: boolean;
}

const NO_SNACKBARS: StoredSnackbar[] = [];

let snackbars: StoredSnackbar[] = NO_SNACKBARS;
let lastId = 0;
const listeners = new Set<() => void>();

const setSnackbars = (next: StoredSnackbar[]) => {
  snackbars = next;
  listeners.forEach((listener) => listener());
};

// One message at a time: the open ones are closed so they slide out below the
// new one, which takes the top slot, and the ones already gone are dropped here
// rather than when they close, which would cut their exit animation.
export const showSnackbar = (message: SnackbarMessage) => {
  lastId += 1;
  setSnackbars([
    { ...message, id: lastId, open: true },
    ...snackbars
      .filter((snackbar) => snackbar.open)
      .map((snackbar) => ({ ...snackbar, open: false })),
  ]);
};

export const closeSnackbar = (id: number) => {
  if (!snackbars.some((snackbar) => snackbar.id === id && snackbar.open)) {
    return;
  }
  setSnackbars(
    snackbars.map((snackbar) =>
      snackbar.id === id ? { ...snackbar, open: false } : snackbar
    )
  );
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useSnackbars = () =>
  useSyncExternalStore(
    subscribe,
    () => snackbars,
    () => NO_SNACKBARS
  );
