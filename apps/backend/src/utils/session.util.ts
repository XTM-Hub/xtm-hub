import type { Request } from 'express';
import type { UserLoadUserBy } from '../model/user';
import { toError } from './error/error-guard.util';

const regenerateSession = (req: Request): Promise<void> =>
  new Promise((resolve, reject) => {
    req.session.regenerate((err: unknown) =>
      err ? reject(toError(err)) : resolve()
    );
  });

const saveSession = (req: Request): Promise<void> =>
  new Promise((resolve, reject) => {
    req.session.save((err: unknown) =>
      err ? reject(toError(err)) : resolve()
    );
  });

/**
 * Signs the user into a brand new session. Regenerating destroys the
 * pre-login session in the store and issues a new id, so an id planted or
 * leaked before login (session fixation) never becomes authenticated.
 * Nothing from the pre-login session survives: read what you need first.
 * The session is persisted before returning, so a redirect sent next never
 * races the store write. Any failure rejects: the login must fail.
 */
export const startUserSession = async (
  req: Request,
  user: UserLoadUserBy
): Promise<void> => {
  await regenerateSession(req);
  req.session.user = user;
  try {
    await saveSession(req);
  } catch (error) {
    // express-session saves a modified session again when the response ends:
    // a failed login must not get signed in by that retry.
    delete req.session.user;
    throw error;
  }
};
