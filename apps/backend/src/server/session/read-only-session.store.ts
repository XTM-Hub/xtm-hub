import { Store } from 'express-session/index.js';

// Wraps a session store so that a request can load an existing session without ever changing it.
// express-session calls `touch` at the end of every request that carries a session, even with `resave: false`, and
// the PostgreSQL store answers by renewing `expire` and `updated_at`. A public route that must stay read only mounts
// its own session middleware on top of this store: `get` reads, and `set`, `touch` and `destroy` do nothing.
export class ReadOnlySessionStore extends Store {
  constructor(private readonly store: Store) {
    super();
  }

  get: Store['get'] = (sid, callback) => this.store.get(sid, callback);

  set: Store['set'] = (_sid, _session, callback) => callback?.();

  override touch: Store['touch'] = (_sid, _session, callback) => callback?.();

  destroy: Store['destroy'] = (_sid, callback) => callback?.();
}
