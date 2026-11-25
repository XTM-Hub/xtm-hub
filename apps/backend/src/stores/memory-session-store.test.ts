import { SessionData } from 'express-session';
import { v4 as uuidv4 } from 'uuid';
import { describe, expect, it } from 'vitest';
import { UserLoadUserBy } from '../model/user';
import { MemorySessionStore } from './memory-session-store';

const ONE_HOUR_MS = 60 * 60 * 1000;

const setSession = (
  store: MemorySessionStore,
  sessionId: string,
  session: Partial<SessionData>
) =>
  new Promise<void>((resolve, reject) => {
    store.set(sessionId, session as SessionData, (err) =>
      err ? reject(err) : resolve()
    );
  });

const getSession = (store: MemorySessionStore, sessionId: string) =>
  new Promise<SessionData | null | undefined>((resolve, reject) => {
    store.get(sessionId, (err, session) =>
      err ? reject(err) : resolve(session)
    );
  });

const destroySession = (store: MemorySessionStore, sessionId: string) =>
  new Promise<void>((resolve, reject) => {
    store.destroy(sessionId, (err) => (err ? reject(err) : resolve()));
  });

const buildSession = (userId: string, expiresInMs = ONE_HOUR_MS) => ({
  cookie: {
    originalMaxAge: ONE_HOUR_MS,
    expires: new Date(Date.now() + expiresInMs),
  } as SessionData['cookie'],
  user: { id: userId } as UserLoadUserBy,
  referer: '/redirect-after-login',
});

describe('memorySessionStore', () => {
  describe('updateSessionsUser', () => {
    it('should replace only the user of every active session of that user', async () => {
      // Given
      const store = new MemorySessionStore();
      const userId = uuidv4();
      await setSession(store, 'first', buildSession(userId));
      await setSession(store, 'second', buildSession(userId));
      await setSession(store, 'other', buildSession(uuidv4()));
      const otherSessionBefore = await getSession(store, 'other');
      const updatedUser = { id: userId, first_name: 'Updated' };

      // When
      const updatedCount = await store.updateSessionsUser(userId, updatedUser);

      // Then
      expect(updatedCount).toBe(2);
      for (const sessionId of ['first', 'second']) {
        expect(await getSession(store, sessionId)).toMatchObject({
          user: updatedUser,
          referer: '/redirect-after-login',
        });
      }
      expect(await getSession(store, 'other')).toStrictEqual(
        otherSessionBefore
      );
    });

    it('should not re-insert a destroyed session', async () => {
      // Given
      const store = new MemorySessionStore();
      const userId = uuidv4();
      await setSession(store, 'destroyed', buildSession(userId));
      await destroySession(store, 'destroyed');

      // When
      const updatedCount = await store.updateSessionsUser(userId, {
        id: userId,
      });

      // Then
      expect(updatedCount).toBe(0);
      expect(await getSession(store, 'destroyed')).toBeUndefined();
    });

    it('should not update an expired session', async () => {
      // Given
      const store = new MemorySessionStore();
      const userId = uuidv4();
      await setSession(store, 'expired', buildSession(userId, -1000));

      // When
      const updatedCount = await store.updateSessionsUser(userId, {
        id: userId,
      });

      // Then
      expect(updatedCount).toBe(0);
    });
  });

  describe('hasSessionsOfUser', () => {
    it.each([
      {
        context: 'the user holds an active session',
        expiresInMs: ONE_HOUR_MS,
        expected: true,
      },
      {
        context: 'the only session of the user has expired',
        expiresInMs: -1000,
        expected: false,
      },
    ])(
      'should resolve to $expected when $context',
      async ({ expiresInMs, expected }) => {
        // Given
        const store = new MemorySessionStore();
        const userId = uuidv4();
        await setSession(store, 'session', buildSession(userId, expiresInMs));
        await setSession(store, 'other', buildSession(uuidv4()));

        // When
        const hasSessions = await store.hasSessionsOfUser(userId);

        // Then
        expect(hasSessions).toBe(expected);
      }
    );
  });

  describe('destroySessionsOfUser', () => {
    it('should destroy every active session of that user and only those', async () => {
      // Given
      const store = new MemorySessionStore();
      const userId = uuidv4();
      await setSession(store, 'first', buildSession(userId));
      await setSession(store, 'second', buildSession(userId));
      await setSession(store, 'other', buildSession(uuidv4()));

      // When
      const destroyedCount = await store.destroySessionsOfUser(userId);

      // Then
      expect(destroyedCount).toBe(2);
      expect(await getSession(store, 'first')).toBeUndefined();
      expect(await getSession(store, 'second')).toBeUndefined();
      expect(await getSession(store, 'other')).toBeDefined();
    });
  });
});
