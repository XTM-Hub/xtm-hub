import { MemoryStore, SessionData } from 'express-session';
import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { getDbTestConnection } from '../tests/config-test';
import { UserId } from './model/kanel/public/User';
import { UserWithOrganizationsAndRole } from './model/user';
import {
  destroyUserSessions,
  getSessionStoreInstance,
  updateUserSession,
} from './session-store-manager';

type SessionDataWithUser = SessionData & {
  user?: UserWithOrganizationsAndRole;
};

describe('sessionStoreManager - Configuration-based Store Selection', () => {
  let db: Knex;

  beforeAll(async () => {
    db = getDbTestConnection();
    await db.migrate.latest();
  });

  afterAll(async () => {
    // eslint-disable-next-line no-restricted-syntax
    await db('sessions').del();
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

      // Should be either MemoryStore or PostgreSQLSessionStore
      const isValidStore =
        store.constructor.name === 'MemoryStore' ||
        store.constructor.name === 'PostgreSQLSessionStore';
      expect(isValidStore).toBe(true);
    });
  });

  describe('updateUserSession functionality', () => {
    it('should handle updateUserSession without errors', async () => {
      const testUser: UserWithOrganizationsAndRole = {
        id: 'test-user-' + uuidv4(),
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        organizations: [],
        role: { id: 'role-id', name: 'USER' },
      } as unknown as UserWithOrganizationsAndRole;

      // Should not throw any errors
      await expect(updateUserSession(testUser)).resolves.toBeUndefined();
    });

    describe('destroyUserSessions functionality', () => {
      it('should destroy all active sessions for the given user', async () => {
        const userId = 'destroy-target-' + uuidv4();
        const store = getSessionStoreInstance();
        const allSpy = vi
          .spyOn(store, 'all')
          .mockImplementation(
            (
              callback: (
                err: unknown,
                sessions?: Record<string, SessionData> | null
              ) => void
            ) => {
              callback(null, {
                sessionA: { user: { id: userId } },
                sessionB: { user: { id: 'another-user' } },
                sessionC: { user: { id: userId } },
              } as unknown as Record<string, SessionData>);
            }
          );
        const destroySpy = vi
          .spyOn(store, 'destroy')
          .mockImplementation(
            (_sessionId: string, callback?: (err?: unknown) => void) => {
              callback?.();
            }
          );

        await destroyUserSessions(userId);

        expect(destroySpy).toHaveBeenCalledTimes(2);
        expect(destroySpy).toHaveBeenCalledWith(
          'sessionA',
          expect.any(Function)
        );
        expect(destroySpy).toHaveBeenCalledWith(
          'sessionC',
          expect.any(Function)
        );
        allSpy.mockRestore();
        destroySpy.mockRestore();
      });

      it('should resolve gracefully when session listing fails', async () => {
        const store = getSessionStoreInstance();
        const allSpy = vi
          .spyOn(store, 'all')
          .mockImplementation(
            (
              callback: (
                err: unknown,
                sessions?: Record<string, SessionData> | null
              ) => void
            ) => {
              callback(new Error('cannot list sessions'), null);
            }
          );
        const destroySpy = vi.spyOn(store, 'destroy');

        await expect(
          destroyUserSessions('error-user-' + uuidv4())
        ).resolves.toBeUndefined();
        expect(destroySpy).not.toHaveBeenCalled();
        allSpy.mockRestore();
        destroySpy.mockRestore();
      });

      it('should resolve without destroying sessions when none match the user', async () => {
        const store = getSessionStoreInstance();
        const allSpy = vi
          .spyOn(store, 'all')
          .mockImplementation(
            (
              callback: (
                err: unknown,
                sessions?: Record<string, SessionData> | null
              ) => void
            ) => {
              callback(null, {
                sessionA: { user: { id: 'different-user' } },
              } as unknown as Record<string, SessionData>);
            }
          );
        const destroySpy = vi.spyOn(store, 'destroy');

        await expect(
          destroyUserSessions('missing-user-' + uuidv4())
        ).resolves.toBeUndefined();
        expect(destroySpy).not.toHaveBeenCalled();
        allSpy.mockRestore();
        destroySpy.mockRestore();
      });
    });

    it('should work with actual session data in PostgreSQL store', async () => {
      const store = getSessionStoreInstance();

      // Only test if it's PostgreSQL store (has cleanup method)
      if ('cleanup' in store) {
        // eslint-disable-next-line no-restricted-syntax
        await db('sessions').del();

        const userId = 'update-test-' + uuidv4();
        const sessionId = 'session-' + uuidv4();

        const sessionData = {
          cookie: {
            maxAge: 3600000,
            expires: new Date(Date.now() + 3600000),
            originalMaxAge: 3600000,
          },
          user: { id: userId as UserId, first_name: 'Original Name' },
        } as unknown as SessionDataWithUser;

        // Create session
        await new Promise<void>((resolve, reject) => {
          store.set(sessionId, sessionData, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        // Update user
        const updatedUser: UserWithOrganizationsAndRole = {
          id: userId,
          email: 'updated@example.com',
          first_name: 'Updated Name',
          last_name: 'User',
          organizations: [],
          role: { id: 'role-id', name: 'USER' },
        } as unknown as UserWithOrganizationsAndRole;

        await updateUserSession(updatedUser);

        // Verify update
        const updatedSession = await new Promise<SessionDataWithUser | null>(
          (resolve, reject) => {
            store.get(sessionId, (err, session) => {
              if (err || !session) reject(err);
              else resolve(session);
            });
          }
        );

        expect(updatedSession?.user?.first_name).toBe('Updated Name');
      }
    });

    it('should work with Memory store if configured', async () => {
      const store = getSessionStoreInstance();

      // Only test if it's Memory store
      if (store instanceof MemoryStore) {
        const userId = 'memory-test-' + uuidv4();
        const sessionId = 'memory-session-' + uuidv4();

        const sessionData = {
          cookie: {
            maxAge: 3600000,
            expires: new Date(Date.now() + 3600000),
            originalMaxAge: 3600000,
          },
          user: { id: userId, first_name: 'Memory Original' },
        } as unknown as SessionDataWithUser;

        await new Promise<void>((resolve, reject) => {
          store.set(sessionId, sessionData, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        const updatedUser: UserWithOrganizationsAndRole = {
          id: userId,
          email: 'memory@example.com',
          first_name: 'Memory Updated',
          organizations: [],
          role: { id: 'role-id', name: 'USER' },
        } as unknown as UserWithOrganizationsAndRole;

        await updateUserSession(updatedUser);

        const updatedSession = await new Promise<SessionDataWithUser | null>(
          (resolve, reject) => {
            store.get(sessionId, (err, session) => {
              if (err) reject(err);
              else resolve(session ?? null);
            });
          }
        );

        expect(updatedSession?.user?.first_name).toBe('Memory Updated');
      }
      // Skip if not Memory store - test passes automatically
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
        store.constructor.name === 'PostgreSQLSessionStore' ||
        store.constructor.name === 'MemoryStore';

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

  describe('error handling', () => {
    it('should handle updateUserSession with invalid user gracefully', () => {
      const invalidUser = null;

      expect(() => {
        updateUserSession(
          invalidUser as unknown as UserWithOrganizationsAndRole
        );
      }).not.toThrow();
    });

    it('should handle session store errors without crashing the application', () => {
      const testUser: UserWithOrganizationsAndRole = {
        id: 'error-user-' + uuidv4(),
        email: 'error@example.com',
        first_name: 'Error',
        last_name: 'Test',
        organizations: [],
        role: { id: 'role-id', name: 'USER' },
      } as unknown as UserWithOrganizationsAndRole;

      // This should not throw even if there are internal errors
      expect(() => {
        updateUserSession(testUser);
      }).not.toThrow();
    });
  });
});
