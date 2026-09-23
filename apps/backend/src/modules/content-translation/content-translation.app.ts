import {
  ContentTranslationEntry,
  MutationUpsertContentTranslationArgs,
  QueryContentTranslationsArgs,
} from '../../__generated__/resolvers-types';
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

  upsertContentTranslationBy: async (
    args: MutationUpsertContentTranslationArgs
  ): Promise<ContentTranslationEntry[]> => {
    if (!isValidContentTranslationKey(args.input.key)) {
      throw BadRequestError(BadRequestErrorCode.InvalidContentTranslationKey);
    }
    return ContentTranslationDomain.upsertContentTranslation(
      args.input.key,
      args.input.values
    );
  },
};
