import type { SessionOptions, Store } from 'express-session/index.js';

export const SESSION_MAX_AGE = 24 * 60 * 60 * 1000; // 1 day

interface BuildSessionOptionsInput {
  name: string;
  secret: string;
  store?: Store;
}

export const buildSessionOptions = ({
  name,
  secret,
  store,
}: BuildSessionOptionsInput): SessionOptions => ({
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
    // whatever NODE_ENV says, and still set over plain http in local dev and CI.
    secure: 'auto',
    maxAge: SESSION_MAX_AGE,
  },
});
