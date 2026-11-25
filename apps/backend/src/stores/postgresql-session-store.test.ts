import { v4 as uuidv4 } from 'uuid';
import { afterEach, describe, expect, it } from 'vitest';
import { TestHelper } from '../../tests/helper/test.helper';
import { databaseContext } from '../context/database.context';
import { UserLoadUserBy } from '../model/user';
import { PostgreSQLSessionStore } from './postgresql-session-store';

describe('postgreSQLSessionStore', () => {
  describe('updateSessionsUser', () => {
    const store = new PostgreSQLSessionStore();
    const createdSessionIds: string[] = [];

    const createSession = async (userId: string) => {
      const sessionId = await TestHelper.session.create({
        user: { id: userId } as UserLoadUserBy,
        referer: '/redirect-after-login',
      });
      createdSessionIds.push(sessionId);
      return sessionId;
    };

    afterEach(async () => {
      await Promise.all(
        createdSessionIds.splice(0).map(TestHelper.session.delete)
      );
    });

    it('should replace only the user of every session of that user', async () => {
      // Given
      const userId = uuidv4();
      const sessionIds = [
        await createSession(userId),
        await createSession(userId),
      ];
      const otherSessionId = await createSession(uuidv4());
      const otherSessionBefore = await TestHelper.session.load(otherSessionId);
      const updatedUser = { id: userId, first_name: 'Updated' };

      // When
      const updatedCount = await store.updateSessionsUser(userId, updatedUser);

      // Then
      expect(updatedCount).toBe(2);
      for (const sessionId of sessionIds) {
        expect(await TestHelper.session.load(sessionId)).toMatchObject({
          user: updatedUser,
          referer: '/redirect-after-login',
        });
      }
      expect(await TestHelper.session.load(otherSessionId)).toStrictEqual(
        otherSessionBefore
      );
    });

    it('should not re-insert a destroyed session', async () => {
      // Given
      const userId = uuidv4();
      const sessionId = await createSession(userId);
      await TestHelper.session.delete(sessionId);

      // When
      const updatedCount = await store.updateSessionsUser(userId, {
        id: userId,
      });

      // Then
      expect(updatedCount).toBe(0);
      expect(await TestHelper.session.load(sessionId)).toBeNull();
    });
  });

  describe('hasSessionsOfUser', () => {
    const store = new PostgreSQLSessionStore();
    const createdSessionIds: string[] = [];

    afterEach(async () => {
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
        createdSessionIds.push(
          await TestHelper.session.create({
            user: { id: uuidv4() } as UserLoadUserBy,
          })
        );
        if (hasSession) {
          createdSessionIds.push(
            await TestHelper.session.create({
              user: { id: userId } as UserLoadUserBy,
            })
          );
        }

        // When
        const result = await store.hasSessionsOfUser(userId);

        // Then
        expect(result).toBe(hasSession);
      }
    );
  });

  describe('updateSessionsUser in a transaction', () => {
    const store = new PostgreSQLSessionStore();
    const createdSessionIds: string[] = [];

    afterEach(async () => {
      await Promise.all(
        createdSessionIds.splice(0).map(TestHelper.session.delete)
      );
    });

    it('should leave the sessions unchanged when the transaction rolls back', async () => {
      // Given
      const userId = uuidv4();
      const sessionId = await TestHelper.session.create({
        user: { id: userId, first_name: 'Original' } as UserLoadUserBy,
      });
      createdSessionIds.push(sessionId);
      const sessionBefore = await TestHelper.session.load(sessionId);

      // When
      const call = databaseContext.withTransaction(async () => {
        await store.updateSessionsUser(
          userId,
          { id: userId },
          databaseContext.getTransaction()
        );
        throw new Error('rolled back');
      });

      // Then
      await expect(call).rejects.toThrow('rolled back');
      expect(await TestHelper.session.load(sessionId)).toStrictEqual(
        sessionBefore
      );
    });
  });
});
