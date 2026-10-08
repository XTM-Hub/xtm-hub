'use client';

import {
  closeSnackbar,
  useSnackbars,
} from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import {
  Snackbar,
  SnackbarProvider,
  SnackbarViewport,
} from '@filigran/design-system';
import { ReactNode } from 'react';
// The app composes the tokens itself, so it never gets the enter, exit and
// swipe keyframes bundled in the package's compiled stylesheet.
import '@filigran/design-system/styles/motion.css';

interface AppSnackbarsProps {
  children: ReactNode;
}

// Wraps the pages so any component can render its own Snackbar into the one
// shared viewport.
export const AppSnackbars = ({ children }: AppSnackbarsProps) => {
  const t = useTranslate();
  const snackbars = useSnackbars();

  return (
    <SnackbarProvider>
      {children}
      {snackbars.map(({ id, severity, title, description, open }) => (
        <Snackbar
          key={id}
          severity={severity}
          title={title}
          description={description}
          open={open}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              closeSnackbar(id);
            }
          }}
          closeLabel={t('Utils.Close')}
        />
      ))}
      {/* The overlays painted after this portal sit at the same z-50. */}
      <SnackbarViewport className="z-[100]" />
    </SnackbarProvider>
  );
};
