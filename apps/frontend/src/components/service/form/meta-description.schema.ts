import {
  buildResourceMetaDescription,
  META_DESCRIPTION_MAX_LENGTH,
  META_DESCRIPTION_MIN_LENGTH,
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

const lengthMessage = (rule: string, length: number) =>
  `${rule}: the generated meta-description has ${length} characters, it must have between ${META_DESCRIPTION_MIN_LENGTH} and ${META_DESCRIPTION_MAX_LENGTH}`;

const errorMessage = (
  error: MetaDescriptionErrorCode,
  metaDescription: string
) => {
  switch (error) {
    case MetaDescriptionErrorCode.REQUIRED:
      return 'Required';
    case MetaDescriptionErrorCode.TOO_SHORT:
      return lengthMessage('Too short', metaDescription.length);
    case MetaDescriptionErrorCode.TOO_LONG:
      return lengthMessage('Too long', metaDescription.length);
    case MetaDescriptionErrorCode.INVALID_DASH:
      return 'Long dashes (— or –) are not allowed: use a plain hyphen (-)';
    case MetaDescriptionErrorCode.MATCHES_TITLE:
      return 'The generated meta-description must not start with the name of the resource';
  }
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
  resourceType: ShareableResourceType
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
          error,
          buildResourceMetaDescription(resourceType, summary)
        ),
      });
    }
  });
