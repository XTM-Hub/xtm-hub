import {
  ContentTranslationEntry,
  MutationSaveContentTranslationDraftArgs,
  QueryContentTranslationDraftsArgs,
  QueryContentTranslationsArgs,
} from '../../__generated__/resolvers-types';
import { withTransaction } from '../../context/database.context';
import { BadRequestErrorCode } from '../../utils/error/error.code';
import { BadRequestError } from '../../utils/error/error.util';
import { ContentTranslationDomain } from './content-translation.domain';
import { isValidContentTranslationKey } from './content-translation.helper';

export const ContentTranslationApp = {
  loadContentTranslationsBy: ({
    locale,
    keys,
  }: QueryContentTranslationsArgs): Promise<ContentTranslationEntry[]> => {
    return ContentTranslationDomain.loadContentTranslationsBy({
      locale,
      keys,
    });
  },

  loadContentTranslationDraftsBy: ({
    keys,
  }: QueryContentTranslationDraftsArgs): Promise<ContentTranslationEntry[]> => {
    return ContentTranslationDomain.loadContentTranslationDraftsBy(keys);
  },

  saveContentTranslationDraftBy: async (
    args: MutationSaveContentTranslationDraftArgs
  ): Promise<ContentTranslationEntry[]> => {
    if (!isValidContentTranslationKey(args.input.key)) {
      throw BadRequestError(BadRequestErrorCode.InvalidContentTranslationKey);
    }
    return ContentTranslationDomain.upsertContentTranslationDraft(
      args.input.key,
      args.input.values
    );
  },

  // Keys were validated when saved as drafts. The publisher becomes the
  // updater of the live rows.
  publishContentTranslationDrafts: (): Promise<ContentTranslationEntry[]> =>
    withTransaction(async () => {
      const drafts =
        await ContentTranslationDomain.deleteContentTranslationDrafts();
      const published: ContentTranslationEntry[] = [];
      for (const key of new Set(drafts.map((draft) => draft.key))) {
        published.push(
          ...(await ContentTranslationDomain.upsertContentTranslation(
            key,
            drafts.filter((draft) => draft.key === key)
          ))
        );
      }
      return published;
    }),

  discardContentTranslationDrafts: async (): Promise<number> => {
    const discarded =
      await ContentTranslationDomain.deleteContentTranslationDrafts();
    return discarded.length;
  },
};
