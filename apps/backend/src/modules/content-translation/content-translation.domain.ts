import { db } from '../../../knexfile';
import { ContentTranslationEntry } from '../../__generated__/resolvers-types';
import { requestContext } from '../../context/request.context';
import ContentTranslation from '../../model/kanel/public/ContentTranslation';

export interface LoadContentTranslationsFilter {
  locale?: ContentTranslation['locale'] | null;
  keys?: readonly string[] | null;
}

type ContentTranslationValue = Pick<ContentTranslation, 'locale' | 'value'>;
type ContentTranslationRow = ContentTranslationValue & { key: string };

const toRows = (rows: readonly ContentTranslationRow[]) => {
  const updaterId = requestContext.requireUser().id;
  const updatedAt = new Date();
  return rows.map(({ key, locale, value }) => ({
    key,
    locale,
    value,
    updater_id: updaterId,
    updated_at: updatedAt,
  }));
};

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

  upsertContentTranslations: async (
    rows: readonly ContentTranslationRow[]
  ): Promise<ContentTranslationEntry[]> => {
    if (rows.length === 0) {
      return [];
    }
    return db<ContentTranslationEntry>('ContentTranslation')
      .insert(toRows(rows))
      .onConflict(['key', 'locale'])
      .merge(['value', 'updater_id', 'updated_at'])
      .returning('*');
  },

  loadContentTranslationDraftsBy: (
    keys?: readonly string[] | null
  ): Promise<ContentTranslationEntry[]> => {
    return db<ContentTranslationEntry>('ContentTranslationDraft')
      .modify((queryBuilder) => {
        if (keys && keys.length > 0) {
          queryBuilder.whereIn('key', keys);
        }
      })
      .select('*');
  },

  upsertContentTranslationDraft: async (
    key: string,
    values: readonly ContentTranslationValue[]
  ): Promise<ContentTranslationEntry[]> => {
    return db<ContentTranslationEntry>('ContentTranslationDraft')
      .insert(toRows(values.map((value) => ({ key, ...value }))))
      .onConflict(['key', 'locale'])
      .merge(['value', 'updater_id', 'updated_at'])
      .returning('*');
  },

  deleteContentTranslationDrafts: (): Promise<ContentTranslationEntry[]> => {
    return db<ContentTranslationEntry>('ContentTranslationDraft')
      .del()
      .returning('*');
  },
};
