import { MemoryStore, SessionData } from 'express-session';

const isExpired = (session: Partial<SessionData>, now: Date) => {
  const expires = session.cookie?.expires;
  return !!expires && new Date(expires) <= now;
};

export class MemorySessionStore extends MemoryStore {
  // The internal map of express-session's MemoryStore (session id → serialized session),
  // left out of its type definitions
  declare private readonly sessions: Record<string, string>;

  /**
   * The active sessions of a user, keyed by session id, parsed.
   */
  private activeSessionsOfUser(
    userId: string
  ): [string, Partial<SessionData>][] {
    const now = new Date();
    return Object.entries(this.sessions)
      .map(([sessionId, serialized]): [string, Partial<SessionData>] => [
        sessionId,
        JSON.parse(serialized),
      ])
      .filter(
        ([, session]) => session.user?.id === userId && !isExpired(session, now)
      );
  }

  /**
   * Whether the user holds at least one active session.
   */
  hasSessionsOfUser(userId: string): Promise<boolean> {
    return Promise.resolve(this.activeSessionsOfUser(userId).length > 0);
  }

  /**
   * Replace the user stored in every active session of that user.
   * The sessions are read and written in one synchronous pass, so no destroy can land in
   * between: unlike `set`, it never re-inserts a session destroyed meanwhile, nor rewrites
   * the cookie from a stale snapshot.
   * Resolves to the number of sessions updated.
   */
  updateSessionsUser(userId: string, user: { id: string }): Promise<number> {
    const sessions = this.activeSessionsOfUser(userId);
    for (const [sessionId, session] of sessions) {
      this.sessions[sessionId] = JSON.stringify({ ...session, user });
    }
    return Promise.resolve(sessions.length);
  }

  /**
   * Destroy every active session of a user, in one synchronous pass.
   * Resolves to the number of sessions destroyed.
   */
  destroySessionsOfUser(userId: string): Promise<number> {
    const sessions = this.activeSessionsOfUser(userId);
    for (const [sessionId] of sessions) {
      // Synchronous in express-session's MemoryStore, so the whole pass stays atomic
      this.destroy(sessionId);
    }
    return Promise.resolve(sessions.length);
  }
}
