import { SessionData, Store } from 'express-session';
import { Knex } from 'knex';
import { database } from '../../knexfile';
import { logApp } from '../utils/app-logger.util';

export class PostgreSQLSessionStore extends Store {
  private tableName = 'sessions';

  /**
   * Get a session by session ID
   */
  override get(
    sid: string,
    callback: (err: unknown, session?: SessionData | null) => void
  ): void {
    database(this.tableName)
      .select('sess')
      .where('sid', sid)
      .where('expire', '>', new Date())
      .first()
      .then((row) => {
        if (!row) {
          return callback(null, null);
        }
        callback(null, row.sess);
      })
      .catch((error) => {
        logApp.error('PostgreSQLSessionStore get error:', { error });
        callback(error);
      });
  }

  /**
   * Set/update a session
   */
  override set(
    sid: string,
    session: SessionData,
    callback?: (err?: unknown) => void
  ): void {
    const expire = this.getExpireDate(session);
    const now = new Date();

    database(this.tableName)
      .insert({
        sid,
        sess: JSON.stringify(session),
        expire,
        created_at: now,
        updated_at: now,
      })
      .onConflict('sid')
      .merge({
        sess: JSON.stringify(session),
        expire,
        updated_at: now,
      })
      .then(() => {
        if (callback) callback();
      })
      .catch((error) => {
        logApp.error('PostgreSQLSessionStore set error:', { error });
        if (callback) callback(error);
      });
  }

  /**
   * The active sessions of a user, looked up through `idx_sessions_user_id`
   * rather than by loading and parsing every session as `all` does.
   * With a transaction, the statement runs inside it rather than on a connection of its own.
   */
  private activeSessionsOfUser(userId: string, trx?: Knex.Transaction) {
    const query = database(this.tableName)
      .whereRaw(`sess->'user'->>'id' = ?`, [userId])
      .where('expire', '>', new Date());
    return trx ? query.transacting(trx) : query;
  }

  /**
   * Whether the user holds at least one active session.
   */
  async hasSessionsOfUser(
    userId: string,
    trx?: Knex.Transaction
  ): Promise<boolean> {
    const session = await this.activeSessionsOfUser(userId, trx)
      .select('sid')
      .first();
    return !!session;
  }

  /**
   * Replace the user stored in every active session of that user, in one statement.
   * Only the `user` key changes: unlike `set`, it never re-inserts a session destroyed
   * meanwhile, nor rewrites the cookie or the expiry from a stale snapshot.
   * Resolves to the number of sessions updated.
   */
  updateSessionsUser(
    userId: string,
    user: { id: string },
    trx?: Knex.Transaction
  ): Promise<number> {
    return this.activeSessionsOfUser(userId, trx).update({
      sess: database.raw(`jsonb_set(sess, '{user}', ?::jsonb)`, [
        JSON.stringify(user),
      ]),
      updated_at: new Date(),
    });
  }

  /**
   * Destroy every active session of a user, in one statement.
   * Resolves to the number of sessions destroyed.
   */
  destroySessionsOfUser(
    userId: string,
    trx?: Knex.Transaction
  ): Promise<number> {
    return this.activeSessionsOfUser(userId, trx).del();
  }

  /**
   * Destroy a session
   */
  override destroy(sid: string, callback?: (err?: unknown) => void): void {
    database(this.tableName)
      .where('sid', sid)
      .del()
      .then(() => {
        if (callback) callback();
      })
      .catch((error) => {
        logApp.error('PostgreSQLSessionStore destroy error:', { error });
        if (callback) callback(error);
      });
  }

  /**
   * Get all sessions (part of the express-session store API)
   */
  override all(
    callback: (
      err: unknown,
      sessions?: { [sid: string]: SessionData } | null
    ) => void
  ): void {
    database(this.tableName)
      .select('sid', 'sess')
      .where('expire', '>', new Date())
      .then((rows) => {
        const sessions: { [sid: string]: SessionData } = {};
        rows.forEach((row) => {
          try {
            sessions[row.sid] =
              typeof row.sess === 'string' ? JSON.parse(row.sess) : row.sess;
          } catch (error) {
            logApp.error(
              `PostgreSQLSessionStore parse error for session ${row.sid}:`,
              { error }
            );
          }
        });
        callback(null, sessions);
      })
      .catch((error) => {
        logApp.error('PostgreSQLSessionStore all error:', { error });
        callback(error);
      });
  }

  /**
   * Clear all sessions
   */
  override clear(callback?: (err?: unknown) => void): void {
    database(this.tableName)
      .del()
      .then(() => {
        if (callback) callback();
      })
      .catch((error) => {
        logApp.error('PostgreSQLSessionStore clear error:', { error });
        if (callback) callback(error);
      });
  }

  /**
   * Get session count
   */
  override length(callback: (err: unknown, length?: number) => void): void {
    database(this.tableName)
      .where('expire', '>', new Date())
      .count('* as count')
      .first()
      .then((result) => {
        const count = parseInt((result?.count as string) || '0', 10);
        callback(null, count);
      })
      .catch((err) => {
        logApp.error('PostgreSQLSessionStore length error:', err);
        callback(err);
      });
  }

  /**
   * Touch a session (update expiration)
   */
  override touch(
    sid: string,
    session: SessionData,
    callback?: (err?: unknown) => void
  ): void {
    const expire = this.getExpireDate(session);

    database(this.tableName)
      .where('sid', sid)
      .update({
        expire,
        updated_at: new Date(),
      })
      .then(() => {
        if (callback) callback();
      })
      .catch((err) => {
        logApp.error('PostgreSQLSessionStore touch error:', err);
        if (callback) callback(err);
      });
  }

  /**
   * Clean up expired sessions
   */
  cleanup(callback?: (err?: unknown, count?: number) => void): void {
    database(this.tableName)
      .where('expire', '<=', new Date())
      .del()
      .then((deletedCount) => {
        logApp.info(
          `PostgreSQLSessionStore cleaned up ${deletedCount} expired sessions`
        );
        if (callback) callback(null, deletedCount);
      })
      .catch((err) => {
        logApp.error('PostgreSQLSessionStore cleanup error:', err);
        if (callback) callback(err);
      });
  }

  /**
   * Calculate expiration date for a session
   */
  private getExpireDate(session: SessionData): Date {
    const maxAge = session.cookie?.maxAge;
    if (maxAge) {
      return new Date(Date.now() + maxAge);
    }

    // Default to 24 hours if no maxAge is set
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
}
