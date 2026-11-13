import { CustomApolloError, ErrorType } from '../../utils/error/error.type';
import {
  ForbiddenAccess,
  UnauthenticatedAccess,
} from '../../utils/error/error.util';
import { DenialCode } from './guard.types';

// Built with the apollo-errors builders so formatError does not mask them as UNKNOWN_ERROR
export const buildGuardError = (code: DenialCode): CustomApolloError => {
  if (code === ErrorType.Unauthenticated) {
    return UnauthenticatedAccess(code);
  }
  const error = ForbiddenAccess(ErrorType.ForbiddenAccess);
  // ForbiddenAccess sets no code, Apollo would answer INTERNAL_SERVER_ERROR
  error.extensions = { code: ErrorType.ForbiddenAccess };
  return error;
};
