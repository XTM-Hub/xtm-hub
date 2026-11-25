import { SessionData } from 'express-session';
import { v4 as uuidv4 } from 'uuid';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../tests/helper/test.helper';
import { UserLoadUserBy } from './model/user';
import {
  destroyUserSessions,
  getSessionStoreInstance,
  hasActiveUserSessions,
  refreshUserSessions,
} from './session-store-manager';
import { MemorySessionStore } from './stores/memory-session-store';
import { PostgreSQLSessionStore } from './stores/postgresql-session-store';

describe('sessionStoreManager - Configuration-based Store Selection', () => {
  afterAll(async () => {
    await TestHelper.session.clear();
  });

  describe('store Instance', () => {
    it('should return a session store instance', () => {
      const store = getSessionStoreInstance();
      expect(store).toBeDefined();
      expect(typeof store.get).toBe('function');
      expect(typeof store.set).toBe('function');
      expect(typeof store.destroy).toBe('function');
      expect(typeof store.all).toBe('function');
    });

    it('should return singleton instances', () => {
      const store1 = getSessionStoreInstance();
      const store2 = getSessionStoreInstance();
      expect(store1).toBe(store2);
    });

    it('should support both Memory and PostgreSQL store interfaces', () => {
      const store = getSessionStoreInstance();

      // Test that it has the expected interface regardless of implementation
      expect(store).toHaveProperty('get');
      expect(store).toHaveProperty('set');
      expect(store).toHaveProperty('destroy');
      expect(store).toHaveProperty('all');

      // Should be either MemorySessionStore or PostgreSQLSessionStore
      const isValidStore =
        store instanceof MemorySessionStore ||
        store instanceof PostgreSQLSessionStore;
      expect(isValidStore).toBe(true);
    });
  });

  describe('destroyUserSessions', () => {
    const createdSessionIds: string[] = [];

    const createSession = async (userId: string) => {
      const sessionId = await TestHelper.session.create({
        user: { id: userId } as UserLoadUserBy,
      });
      createdSessionIds.push(sessionId);
      return sessionId;
    };

    afterEach(async () => {
      vi.restoreAllMocks();
      await Promise.all(
        createdSessionIds.splice(0).map(TestHelper.session.delete)
      );
    });

    it('should destroy every active session of the user and only those', async () => {
      // Given
      const userId = uuidv4();
      const firstSessionId = await createSession(userId);
      const secondSessionId = await createSession(userId);
      const otherSessionId = await createSession(uuidv4());

      // When
      await destroyUserSessions(userId);

      // Then
      expect(await TestHelper.session.load(firstSessionId)).toBeNull();
      expect(await TestHelper.session.load(secondSessionId)).toBeNull();
      expect(await TestHelper.session.load(otherSessionId)).not.toBeNull();
    });

    it('should look the sessions of the user up without scanning every session', async () => {
      // Given
      const userId = uuidv4();
      await createSession(userId);
      const allSpy = vi.spyOn(getSessionStoreInstance(), 'all');

      // When
      await destroyUserSessions(userId);

      // Then
      expect(allSpy).not.toHaveBeenCalled();
    });

    it('should resolve and keep the sessions when the store fails', async () => {
      // Given
      const userId = uuidv4();
      const sessionId = await createSession(userId);
      vi.spyOn(
        PostgreSQLSessionStore.prototype,
        'destroySessionsOfUser'
      ).mockRejectedValueOnce(new Error('database unavailable'));

      // When
      await expect(destroyUserSessions(userId)).resolves.toBeUndefined();

      // Then
      expect(await TestHelper.session.load(sessionId)).not.toBeNull();
    });
  });

  describe('hasActiveUserSessions', () => {
    const createdSessionIds: string[] = [];

    afterEach(async () => {
      vi.restoreAllMocks();
      await Promise.all(
        createdSessionIds.splice(0).map(TestHelper.session.delete)
      );
    });

    it.each([
      { context: 'the user holds an active session', hasSession: true },
      { context: 'the user holds no session', hasSession: false },
    ])(
      'should resolve to $hasSession when $context',
      async ({ hasSession }) => {
        // Given
        const userId = uuidv4();
        if (hasSession) {
          createdSessionIds.push(
            await TestHelper.session.create({
              user: { id: userId } as UserLoadUserBy,
            })
          );
        }

        // When
        const result = await hasActiveUserSessions(userId);

        // Then
        expect(result).toBe(hasSession);
      }
    );

    it('should resolve to true when the store fails, so the refresh still runs', async () => {
      // Given
      vi.spyOn(
        PostgreSQLSessionStore.prototype,
        'hasSessionsOfUser'
      ).mockRejectedValueOnce(new Error('database unavailable'));

      // When
      const result = await hasActiveUserSessions(uuidv4());

      // Then
      expect(result).toBe(true);
    });
  });

  describe('refreshUserSessions', () => {
    const createdSessionIds: string[] = [];

    const createSession = async (userId: string) => {
      const sessionId = await TestHelper.session.create({
        user: { id: userId, first_name: 'Original' } as UserLoadUserBy,
        referer: '/redirect-after-login',
      });
      createdSessionIds.push(sessionId);
      return sessionId;
    };

    const buildUser = (userId: string) =>
      ({ id: userId, first_name: 'Updated' }) as UserLoadUserBy;

    afterEach(async () => {
      vi.restoreAllMocks();
      await Promise.all(
        createdSessionIds.splice(0).map(TestHelper.session.delete)
      );
    });

    it('should only replace the user of every active session of the user', async () => {
      // Given
      const userId = uuidv4();
      const sessionIds = [
        await createSession(userId),
        await createSession(userId),
      ];
      const sessionsBefore = await Promise.all(
        sessionIds.map(TestHelper.session.load)
      );
      const user = buildUser(userId);

      // When
      await refreshUserSessions(user);

      // Then
      for (const [index, sessionId] of sessionIds.entries()) {
        expect(await TestHelper.session.load(sessionId)).toStrictEqual({
          ...sessionsBefore[index],
          user,
        });
      }
    });

    it('should leave the sessions of other users untouched', async () => {
      // Given
      const userId = uuidv4();
      await createSession(userId);
      const otherSessionId = await createSession(uuidv4());
      const otherSessionBefore = await TestHelper.session.load(otherSessionId);

      // When
      await refreshUserSessions(buildUser(userId));

      // Then
      expect(await TestHelper.session.load(otherSessionId)).toStrictEqual(
        otherSessionBefore
      );
    });

    it('should not re-insert a destroyed session', async () => {
      // Given
      const userId = uuidv4();
      const sessionId = await createSession(userId);
      // A logout, or an admin disabling the user, lands before the refresh
      await TestHelper.session.delete(sessionId);

      // When
      await refreshUserSessions(buildUser(userId));

      // Then
      expect(await TestHelper.session.load(sessionId)).toBeNull();
    });

    it('should refresh the sessions of the user without scanning every session', async () => {
      // Given
      const userId = uuidv4();
      await createSession(userId);
      const allSpy = vi.spyOn(getSessionStoreInstance(), 'all');

      // When
      await refreshUserSessions(buildUser(userId));

      // Then
      expect(allSpy).not.toHaveBeenCalled();
    });

    it('should resolve and keep the sessions unchanged when the store fails', async () => {
      // Given
      const userId = uuidv4();
      const sessionId = await createSession(userId);
      const sessionBefore = await TestHelper.session.load(sessionId);
      vi.spyOn(
        PostgreSQLSessionStore.prototype,
        'updateSessionsUser'
      ).mockRejectedValueOnce(new Error('database unavailable'));

      // When
      await expect(
        refreshUserSessions(buildUser(userId))
      ).resolves.toBeUndefined();

      // Then
      expect(await TestHelper.session.load(sessionId)).toStrictEqual(
        sessionBefore
      );
    });
  });

  describe('session operations', () => {
    it('should support basic session CRUD operations', async () => {
      const store = getSessionStoreInstance();
      const sessionId = 'crud-test-' + uuidv4();

      const sessionData = {
        cookie: {
          maxAge: 3600000,
          expires: new Date(Date.now() + 3600000),
          originalMaxAge: 3600000,
        },
        user: { id: 'crud-user', name: 'Test User' },
      } as unknown as SessionData;

      // Create
      await new Promise<void>((resolve, reject) => {
        store.set(sessionId, sessionData, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Read
      const retrievedSession = await new Promise<SessionData | null>(
        (resolve, reject) => {
          store.get(sessionId, (err, session) => {
            if (err) reject(err);
            else resolve(session ?? null);
          });
        }
      );

      expect(retrievedSession).toBeDefined();
      expect(
        (retrievedSession as unknown as { user?: { name?: string } })?.user
          ?.name
      ).toBe('Test User');

      // Delete
      await new Promise<void>((resolve, reject) => {
        store.destroy(sessionId, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Verify deletion
      const deletedSession = await new Promise<SessionData | null>(
        (resolve, reject) => {
          store.get(sessionId, (err, session) => {
            if (err) reject(err);
            else resolve(session ?? null);
          });
        }
      );

      expect(deletedSession).toBeNull();
    });

    it('should handle non-existent sessions gracefully', async () => {
      const store = getSessionStoreInstance();
      const nonExistentId = 'non-existent-' + uuidv4();

      const session = await new Promise<SessionData | null>(
        (resolve, reject) => {
          store.get(nonExistentId, (err, session) => {
            if (err) reject(err);
            else resolve(session ?? null);
          });
        }
      );

      expect(session).toBeNull();
    });
  });

  describe('store configuration validation', () => {
    it('should use the store type defined in configuration', () => {
      const store = getSessionStoreInstance();

      // The store should be one of the valid types based on configuration
      const isValidStoreType =
        store instanceof PostgreSQLSessionStore ||
        store instanceof MemorySessionStore;

      expect(isValidStoreType).toBe(true);
    });

    it('should maintain consistent behavior across store types', async () => {
      const store = getSessionStoreInstance();

      // Both stores should support the same basic interface
      expect(typeof store.get).toBe('function');
      expect(typeof store.set).toBe('function');
      expect(typeof store.destroy).toBe('function');
      expect(typeof store.all).toBe('function');

      // Test that all() returns sessions in expected format
      const allSessions = await new Promise((resolve, reject) => {
        store.all((err, sessions) => {
          if (err) reject(err);
          else resolve(sessions);
        });
      });

      // Should return an object (even if empty) or null
      expect(typeof allSessions === 'object').toBe(true);
    });
  });
});
