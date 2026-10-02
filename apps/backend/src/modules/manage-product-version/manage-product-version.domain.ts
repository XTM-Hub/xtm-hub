import { db } from '../../../knexfile';
import type { PlatformIdentifier } from '../../__generated__/resolvers-types';
import type ProductVersion from '../../model/kanel/public/ProductVersion';
import type { ProductVersionInitializer } from '../../model/kanel/public/ProductVersion';

interface LoadRegisteredProductVersionsOptions {
  /** Case-insensitive substring match against the version string. */
  search?: string | null;
  /** Caps the number of returned rows. Omit to return every match. */
  limit?: number;
}

export const ManageProductVersionDomain = {
  registerProductVersion: async (
    initializer: ProductVersionInitializer
  ): Promise<void> => {
    await db<ProductVersion>('ProductVersion')
      .insert(initializer)
      .onConflict(['product', 'version'])
      .ignore();
  },

  loadRegisteredProductVersions: async (
    product: PlatformIdentifier,
    options: LoadRegisteredProductVersionsOptions = {}
  ): Promise<ProductVersion[]> => {
    const { search, limit } = options;
    return db<ProductVersion>('ProductVersion')
      .where({ product })
      .modify((queryBuilder) => {
        if (search) {
          queryBuilder.whereILike('version', `%${search}%`);
        }
        if (limit) {
          queryBuilder.limit(limit);
        }
      })
      .orderBy([
        { column: 'version_padded', order: 'desc' },
        { column: 'id', order: 'desc' },
      ]);
  },
};
