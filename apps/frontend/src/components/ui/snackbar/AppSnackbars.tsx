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
// The app composes the tokens itself, so it never gets the enter, exit and
// swipe keyframes bundled in the package's compiled stylesheet.
import '@filigran/design-system/styles/motion.css';

export const AppSnackbars = () => {
  const t = useTranslate();
  const snackbars = useSnackbars();

  return (
    <SnackbarProvider>
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
      {/* The legacy theme turns `w-100` into 4px, and the overlays painted
          after this portal sit at the same z-50. */}
      <SnackbarViewport className="z-[100] w-[calc(var(--spacing)*100)]" />
    </SnackbarProvider>
  );
};
