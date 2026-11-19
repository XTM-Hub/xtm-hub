import { db } from '../../../knexfile';
import ApiToken, {
  ApiTokenId,
  ApiTokenInitializer,
} from '../../model/kanel/public/ApiToken';
import { OrganizationId } from '../../model/kanel/public/Organization';
import { UserId } from '../../model/kanel/public/User';

export interface ApiTokenWithNames extends ApiToken {
  organization_name: string;
  user_email: string;
}

const withNames = () =>
  db<ApiTokenWithNames>('ApiToken')
    .join('Organization', 'Organization.id', 'ApiToken.organization_id')
    .join('User', 'User.id', 'ApiToken.user_id')
    .select(
      'ApiToken.*',
      'Organization.name as organization_name',
      'User.email as user_email'
    );

export const ApiTokenDomain = {
  insert: async (token: ApiTokenInitializer): Promise<ApiToken> => {
    const [created] = await db<ApiToken>('ApiToken')
      .insert(token)
      .returning('*');
    return created as ApiToken;
  },

  loadById: async (id: ApiTokenId): Promise<ApiTokenWithNames | undefined> =>
    withNames().where('ApiToken.id', id).first(),

  // A token whose hash matches, revoked or expired ones included: the caller says why it refuses one
  loadByHash: async (tokenHash: string): Promise<ApiToken | undefined> =>
    db<ApiToken>('ApiToken').where('token_hash', tokenHash).first(),

  listByUser: async (userId: UserId): Promise<ApiTokenWithNames[]> =>
    withNames()
      .where('ApiToken.user_id', userId)
      .orderBy('ApiToken.created_at', 'desc'),

  listByOrganization: async (
    organizationId: OrganizationId
  ): Promise<ApiTokenWithNames[]> =>
    withNames()
      .where('ApiToken.organization_id', organizationId)
      .orderBy('ApiToken.created_at', 'desc'),

  revoke: async (id: ApiTokenId): Promise<void> => {
    await db<ApiToken>('ApiToken')
      .where('id', id)
      .whereNull('revoked_at')
      .update({ revoked_at: new Date() });
  },

  // Writes `at` unless the stored last use is less than `minIntervalMs` older: never moves it back, and concurrent
  // calls write once
  touchLastUsed: async (
    id: ApiTokenId,
    at: Date,
    minIntervalMs: number
  ): Promise<void> => {
    await db<ApiToken>('ApiToken')
      .where('id', id)
      .andWhere((builder) =>
        builder
          .whereNull('last_used_at')
          .orWhere('last_used_at', '<=', new Date(at.getTime() - minIntervalMs))
      )
      .update({ last_used_at: at });
  },
};
