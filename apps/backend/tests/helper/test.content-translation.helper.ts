import { db } from '../../knexfile';
import ContentTranslation, {
  ContentTranslationMutator,
} from '../../src/model/kanel/public/ContentTranslation';

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
};
