import { loadMeUser } from '@/utils/load-me-user';
import { XTM_PLATFORM_TRIAL_PATH } from '@/utils/path/constant';
import { NextRequest, NextResponse } from 'next/server';
import { loadBaseUrlFront } from './utils/load';
import { getLoginRedirectionURL } from './utils/url';

export const redirectToFreeTrial = async (request: NextRequest) => {
  const baseUrlFront = await loadBaseUrlFront();
  const redirectionUrl = getLoginRedirectionURL(baseUrlFront, request);
  try {
    const user = await loadMeUser();
    if (!user) {
      return NextResponse.redirect(redirectionUrl);
    }

    return NextResponse.redirect(
      new URL(XTM_PLATFORM_TRIAL_PATH, baseUrlFront)
    );
  } catch (error) {
    if ((error as Error).message === 'UNAUTHENTICATED') {
      return NextResponse.redirect(redirectionUrl);
    }

    const loginURL = new URL('/login', baseUrlFront);
    return NextResponse.redirect(loginURL);
  }
};
