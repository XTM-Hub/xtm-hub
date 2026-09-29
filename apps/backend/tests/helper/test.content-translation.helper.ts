import { db } from '../../knexfile';
import ContentTranslation, {
  ContentTranslationKey,
} from '../../src/model/kanel/public/ContentTranslation';
import ContentTranslationDraft, {
  ContentTranslationDraftKey,
} from '../../src/model/kanel/public/ContentTranslationDraft';

// Fixtures use plain string keys: the branded Kanel key only guarantees a
// value read from the table, so the helpers brand it once, here.
type Fixture<Row extends { key: string }> = Omit<Partial<Row>, 'key'> & {
  key: string;
  locale: ContentTranslation['locale'];
};
type Filter<Row extends { key: string }> = Omit<Partial<Row>, 'key'> & {
  key?: string;
};

const toKey = (key: string) => key as ContentTranslationKey;
const toDraftKey = (key: string) => key as ContentTranslationDraftKey;

export const TestContentTranslationHelper = {
  contentTranslation: {
    create: async ({
      key,
      ...data
    }: Fixture<ContentTranslation>): Promise<ContentTranslation> => {
      const [contentTranslation] = await db<ContentTranslation>(
        'ContentTranslation'
      )
        .insert({ value: 'Default value', ...data, key: toKey(key) })
        .returning('*');
      return contentTranslation!;
    },
    delete: async ({ key, ...field }: Filter<ContentTranslation>) => {
      await db<ContentTranslation>('ContentTranslation')
        .where({ ...field, ...(key ? { key: toKey(key) } : {}) })
        .del();
    },
    loadAll: async ({
      key,
      ...field
    }: Filter<ContentTranslation> = {}): Promise<ContentTranslation[]> => {
      return db<ContentTranslation[]>('ContentTranslation')
        .where({ ...field, ...(key ? { key: toKey(key) } : {}) })
        .select('*');
    },
  },
  contentTranslationDraft: {
    create: async ({
      key,
      ...data
    }: Fixture<ContentTranslationDraft>): Promise<ContentTranslationDraft> => {
      const [draft] = await db<ContentTranslationDraft>(
        'ContentTranslationDraft'
      )
        .insert({ value: 'Draft value', ...data, key: toDraftKey(key) })
        .returning('*');
      return draft!;
    },
    delete: async ({ key, ...field }: Filter<ContentTranslationDraft> = {}) => {
      await db<ContentTranslationDraft>('ContentTranslationDraft')
        .where({ ...field, ...(key ? { key: toDraftKey(key) } : {}) })
        .del();
    },
    loadAll: async ({
      key,
      ...field
    }: Filter<ContentTranslationDraft> = {}): Promise<
      ContentTranslationDraft[]
    > => {
      return db<ContentTranslationDraft[]>('ContentTranslationDraft')
        .where({ ...field, ...(key ? { key: toDraftKey(key) } : {}) })
        .select('*');
    },
  },
};
