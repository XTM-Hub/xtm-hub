import { db } from '../../../knexfile';
import { ContentTranslationEntry } from '../../__generated__/resolvers-types';
import { requestContext } from '../../context/request.context';
import ContentTranslation from '../../model/kanel/public/ContentTranslation';

export interface LoadContentTranslationsFilter {
  locale?: ContentTranslation['locale'] | null;
  keys?: readonly string[] | null;
}

export const ContentTranslationDomain = {
  loadContentTranslationsBy: (
    filter: LoadContentTranslationsFilter
  ): Promise<ContentTranslationEntry[]> => {
    return db<ContentTranslationEntry>('ContentTranslation')
      .modify((queryBuilder) => {
        if (filter.locale) {
          queryBuilder.where('locale', filter.locale);
        }
        if (filter.keys && filter.keys.length > 0) {
          queryBuilder.whereIn('key', filter.keys);
        }
      })
      .select('*');
  },

  upsertContentTranslation: async (
    key: string,
    values: readonly Pick<ContentTranslation, 'locale' | 'value'>[]
  ): Promise<ContentTranslationEntry[]> => {
    const updaterId = requestContext.get()?.user?.id;
    const updatedAt = new Date();
    return db<ContentTranslationEntry>('ContentTranslation')
      .insert(
        values.map(({ locale, value }) => ({
          key,
          locale,
          value,
          updater_id: updaterId,
          updated_at: updatedAt,
        }))
      )
      .onConflict(['key', 'locale'])
      .merge(['value', 'updater_id', 'updated_at'])
      .returning('*');
  },
};
