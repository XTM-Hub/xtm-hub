import expressSession, {
  type SessionOptions,
  type Store,
} from 'express-session/index.js';
import { ReadOnlySessionStore } from './read-only-session.store';

export const SESSION_MAX_AGE = 24 * 60 * 60 * 1000; // 1 day

interface SessionMiddlewaresInput {
  name: string;
  secret: string;
  store: Store;
}

const buildSessionOptions = ({
  name,
  secret,
  store,
}: SessionMiddlewaresInput): SessionOptions => ({
  name,
  store,
  secret,
  saveUninitialized: false,
  proxy: true,
  rolling: false,
  resave: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    // Follows the request protocol (X-Forwarded-Proto, read thanks to proxy: true): Secure behind the TLS ingress,
    // whatever the configured environment says, and still set over plain http in local dev and CI.
    secure: 'auto',
    maxAge: SESSION_MAX_AGE,
  },
});

export const createSessionMiddlewares = (input: SessionMiddlewaresInput) => {
  const sessionOptions = buildSessionOptions(input);
  return {
    sessionMiddleware: expressSession(sessionOptions),
    // For the public routes that must not write to the session (no save, no touch): they only read an existing one
    readOnlySessionMiddleware: expressSession({
      ...sessionOptions,
      store: new ReadOnlySessionStore(input.store),
    }),
  };
};
