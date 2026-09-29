import { EDIT_MODE_COOKIE_NAME } from '@/utils/edit-mode-cookie';
import { loadMeUser } from '@/utils/load-me-user';
import { PortalCapability } from '@graphql/generated';
import { cookies } from 'next/headers';
import { cache } from 'react';

type MeUser = Awaited<ReturnType<typeof loadMeUser>>;

// Mirrors the @auth(portalCapa: [BYPASS]) gate on upsertContentTranslation.
export const hasContentEditCapability = (me: MeUser): boolean =>
  me?.capabilities.some(({ name }) => name === PortalCapability.Bypass) ??
  false;

export const isContentEditor = async (): Promise<boolean> => {
  try {
    return hasContentEditCapability(await loadMeUser());
  } catch {
    return false;
  }
};

// The cookie alone is forgeable, so edit mode also requires a verified BYPASS
// user. Memoized per request: layouts, getTranslate() and the i18n request
// config all ask.
export const isContentEditModeActive = cache(async (): Promise<boolean> => {
  const cookieStore = await cookies();
  if (cookieStore.get(EDIT_MODE_COOKIE_NAME)?.value !== '1') {
    return false;
  }
  return isContentEditor();
});
