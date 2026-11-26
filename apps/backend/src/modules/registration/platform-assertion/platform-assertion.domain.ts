import { db, dbRaw } from '../../../../knexfile';
import PlatformAssertionJti, {
  PlatformAssertionJtiJti,
} from '../../../model/kanel/public/PlatformAssertionJti';

export const PlatformAssertionDomain = {
  // Records the id of an accepted assertion. Returns false when it was already recorded: of two concurrent replays,
  // only one insert wins. expiresAt is the instant after which the assertion is refused anyway (its exp plus the
  // allowed clock skew), so the id is kept until then.
  consumeJti: async ({
    jti,
    expiresAt,
  }: {
    jti: string;
    expiresAt: Date;
  }): Promise<boolean> => {
    const inserted = await db<PlatformAssertionJti>('PlatformAssertionJti')
      .insert({
        jti: jti as PlatformAssertionJtiJti,
        expires_at: expiresAt,
      })
      .onConflict('jti')
      .ignore()
      .returning('jti');

    return inserted.length > 0;
  },

  deleteExpiredJtis: async (): Promise<void> => {
    await db<PlatformAssertionJti>('PlatformAssertionJti')
      .where('expires_at', '<', dbRaw('now()'))
      .delete();
  },
};
