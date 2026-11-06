import { DocumentItemFragment } from '@graphql/generated';

type FieldNames<U> = U extends unknown ? keyof U : never;
type FieldValue<U, K extends PropertyKey> = U extends unknown
  ? K extends keyof U
    ? U[K]
    : never
  : never;

/**
 * Any field of any `Document` subtype. `DocumentItemFragment` is a union
 * discriminated on `__typename`, so a fixture builder that serves several
 * subtypes takes its overrides as this type instead of
 * `Partial<DocumentItemFragment>`.
 */
export type DocumentOverrides = {
  [K in FieldNames<DocumentItemFragment>]?: FieldValue<DocumentItemFragment, K>;
};
