import { db } from '../../knexfile';
import ContentTranslation, {
  ContentTranslationMutator,
} from '../../src/model/kanel/public/ContentTranslation';
import ContentTranslationDraft, {
  ContentTranslationDraftMutator,
} from '../../src/model/kanel/public/ContentTranslationDraft';

export const TestContentTranslationHelper = {
  contentTranslation: {
    create: async (
      data: Partial<ContentTranslation> &
        Pick<ContentTranslation, 'key' | 'locale'>
    ): Promise<ContentTranslation> => {
      const [contentTranslation] = await db<ContentTranslation>(
        'ContentTranslation'
      )
        .insert({
          value: 'Default value',
          ...data,
        })
        .returning('*');
      return contentTranslation!;
    },
    delete: async (field: ContentTranslationMutator) => {
      await db<ContentTranslation>('ContentTranslation').where(field).del();
    },
    loadAll: async (
      field: ContentTranslationMutator = {}
    ): Promise<ContentTranslation[]> => {
      return db<ContentTranslation[]>('ContentTranslation')
        .where(field)
        .select('*');
    },
  },
  contentTranslationDraft: {
    create: async (
      data: Partial<ContentTranslationDraft> &
        Pick<ContentTranslationDraft, 'key' | 'locale'>
    ): Promise<ContentTranslationDraft> => {
      const [draft] = await db<ContentTranslationDraft>(
        'ContentTranslationDraft'
      )
        .insert({
          value: 'Draft value',
          ...data,
        })
        .returning('*');
      return draft!;
    },
    delete: async (field: ContentTranslationDraftMutator = {}) => {
      await db<ContentTranslationDraft>('ContentTranslationDraft')
        .where(field)
        .del();
    },
    loadAll: async (
      field: ContentTranslationDraftMutator = {}
    ): Promise<ContentTranslationDraft[]> => {
      return db<ContentTranslationDraft[]>('ContentTranslationDraft')
        .where(field)
        .select('*');
    },
  },
};
