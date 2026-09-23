'use client';

import { useEditMode } from '@/context/edit-mode-context';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';

// Mounted unconditionally in both the public and private root layouts —
// self-hides whenever edit mode is off, so callers don't need any
// pathname-based logic to decide whether to render it. Edit mode is now a
// global, cookie-driven toggle (see /edition and /edition/exit route
// handlers) rather than a separate URL, so it can show up on any page.
// Uses plain useTranslations (not useTranslate) so its own labels are never
// themselves marked as editable while edit mode is on.
export const EditionModeBanner = () => {
  const t = useTranslations('EditableText');
  const pathname = usePathname();
  const { isEditMode } = useEditMode();

  if (!isEditMode) {
    return null;
  }

  return (
    <div className="bg-primary text-primary-foreground flex items-center justify-center gap-2 px-4 py-2 text-sm">
      <span>{t('EditionBannerLabel')}</span>
      {/* Plain <a>, not next/link's <Link>: /edition/exit is a Route
          Handler, not a page, and Next's client-side navigation can no-op
          against paths with no matching page component — a real browser
          navigation is required for the server-side cookie-clearing logic
          to actually run. */}
      <a
        href={`/edition/exit?redirect=${encodeURIComponent(pathname)}`}
        className="underline underline-offset-2">
        {t('EditionBannerExit')}
      </a>
    </div>
  );
};
