import { z } from 'zod';

// Same bounds as the backend (META_DESCRIPTION_MIN_LENGTH / META_DESCRIPTION_MAX_LENGTH in document.helper.ts).
export const META_DESCRIPTION_MIN_LENGTH = 120;
export const META_DESCRIPTION_MAX_LENGTH = 160;
const TOO_SHORT_MESSAGE = `Must contain at least ${META_DESCRIPTION_MIN_LENGTH} characters`;

/** A meta-description is required when a shareable resource is created. */
export const metaDescriptionSchema = z
  .string()
  .trim()
  .min(1, 'Required')
  .min(META_DESCRIPTION_MIN_LENGTH, TOO_SHORT_MESSAGE)
  .max(META_DESCRIPTION_MAX_LENGTH);

/**
 * A resource stored before the meta-description existed has none and stays editable: an empty value keeps the stored
 * one, any other value follows the creation bounds.
 */
export const optionalMetaDescriptionSchema = z
  .string()
  .trim()
  .max(META_DESCRIPTION_MAX_LENGTH)
  .refine(
    (value) =>
      value.length === 0 || value.length >= META_DESCRIPTION_MIN_LENGTH,
    { error: TOO_SHORT_MESSAGE }
  )
  .nullish();
