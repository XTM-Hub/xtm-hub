import { toError } from './error-guard.util';
import {
  AlreadyExistsErrorCode,
  BadRequestErrorCode,
  ForbiddenErrorCode,
  NotFoundErrorCode,
  TooManyRequestsErrorCode,
  UnknownErrorCode,
} from './error.code';
import { CustomApolloError } from './error.type';
import {
  AlreadyExistsError,
  BadRequestError,
  ErrorBuilder,
  ForbiddenAccess,
  NotFoundError,
  TooManyRequestsError,
  UnknownError,
} from './error.util';

const forbiddenErrorSet: Set<string> = new Set(
  Object.values(ForbiddenErrorCode)
);

const badRequestErrorsSet: Set<string> = new Set(
  Object.values(BadRequestErrorCode)
);

const tooManyRequestsErrorSet: Set<string> = new Set(
  Object.values(TooManyRequestsErrorCode)
);

const alreadyExistsErrorSet: Set<string> = new Set(
  Object.values(AlreadyExistsErrorCode)
);

const notFoundErrorsSet: Set<string> = new Set(
  Object.values(NotFoundErrorCode)
);

const errorSetMapping: Map<Set<string>, ErrorBuilder> = new Map();
errorSetMapping.set(forbiddenErrorSet, ForbiddenAccess);
errorSetMapping.set(badRequestErrorsSet, BadRequestError);
errorSetMapping.set(tooManyRequestsErrorSet, TooManyRequestsError);
errorSetMapping.set(alreadyExistsErrorSet, AlreadyExistsError);
errorSetMapping.set(notFoundErrorsSet, NotFoundError);

export const mapToGraphQLError = (
  error: unknown,
  customUnknownErrorCode: UnknownErrorCode = UnknownErrorCode.UnknownError
): CustomApolloError => {
  const normalizedError = toError(error);
  const code = normalizedError.message;
  for (const [mapping, errorBuilder] of errorSetMapping) {
    if (mapping.has(code)) {
      return errorBuilder(code, { detail: normalizedError });
    }
  }

  return UnknownError(customUnknownErrorCode, { detail: normalizedError });
};
