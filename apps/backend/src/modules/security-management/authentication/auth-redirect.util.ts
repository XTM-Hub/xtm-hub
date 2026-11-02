import { ForbiddenErrorCode } from '../../../utils/error/error.code';
import { resolveSessionReferer } from '../../../utils/extract-referer.util';

export const AUTHENTICATED_HOME = '/app';
export const SIGN_IN_ERROR_PAGE = '/sign-up';

/**
 * A failed sign-in lands on the sign-up page, which shows `error` to the user
 * and keeps `redirect` (base64, as the frontend encodes it) for the next try.
 */
export const buildSignInErrorRedirect = (
  error: Error | undefined,
  referer: string | undefined
): string => {
  const params = new URLSearchParams({
    error:
      error?.message === ForbiddenErrorCode.EmailNotVerified
        ? 'email-not-verified'
        : 'login-failed',
  });
  if (referer) {
    params.set('redirect', Buffer.from(referer).toString('base64'));
  }
  return `${SIGN_IN_ERROR_PAGE}?${params.toString()}`;
};

/**
 * Express exposes a repeated query param (?redirect=a&redirect=b) as an array
 * and bracket syntax as an object, so anything but a plain string is discarded.
 */
export const resolveSafeRedirect = (redirect: unknown): string | undefined =>
  typeof redirect === 'string' ? resolveSessionReferer(redirect) : undefined;
