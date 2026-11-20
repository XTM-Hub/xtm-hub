import type { useTranslate } from '@/hooks/use-translate';
import {
  buildResourceMetaDescription,
  MetaDescriptionErrorCode,
  validateMetaDescription,
} from '@/utils/shareable-resources/meta-description.utils';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { z } from 'zod';

/** The summary the meta-description is generated from is required when a shareable resource is created. */
export const metaDescriptionSchema = z.string().trim().min(1, 'Required');

/**
 * A resource stored before the meta-description existed has none and stays editable: an empty summary keeps the
 * stored one.
 */
export const optionalMetaDescriptionSchema = z.string().trim().nullish();

type Translate = ReturnType<typeof useTranslate>;

/**
 * The message of a broken rule, translated: the same `Error.Server` key as the backend error, with the length of the
 * generated meta-description for a length rule.
 */
const errorMessage = (
  t: Translate,
  error: MetaDescriptionErrorCode,
  metaDescription: string
) => {
  const message = t(`Error.Server.${error}`);
  return error === MetaDescriptionErrorCode.TOO_SHORT ||
    error === MetaDescriptionErrorCode.TOO_LONG
    ? t('Service.Form.MetaDescriptionCurrentLength', {
        error: message,
        length: metaDescription.length,
      })
    : message;
};

interface MetaDescriptionFormValues {
  name?: string;
  meta_description?: string | null;
}

/**
 * Validates the meta-description generated from the summary, the product and the type of the resource, rather than
 * the summary alone: it depends on the name too, so the rule sits on the whole form and reports on the summary field.
 * An empty summary is left to the field schema, required on creation and kept on edition. Like every zod refinement,
 * it runs once no field has aborted the parsing: a file still to upload hides its error until the file is there.
 */
export const withMetaDescriptionRule = <
  Schema extends z.ZodType<MetaDescriptionFormValues>,
>(
  schema: Schema,
  resourceType: ShareableResourceType,
  t: Translate
) =>
  schema.superRefine((values, ctx) => {
    const summary = values.meta_description ?? '';
    if (summary.length === 0) {
      return;
    }

    const error = validateMetaDescription({
      resourceType,
      summary,
      title: values.name ?? '',
    });
    if (error) {
      ctx.addIssue({
        code: 'custom',
        path: ['meta_description'],
        message: errorMessage(
          t,
          error,
          buildResourceMetaDescription(resourceType, summary)
        ),
      });
    }
  });
