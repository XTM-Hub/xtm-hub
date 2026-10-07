import { ApolloError } from 'apollo-errors';

export type ErrorLogLevel = 'debug' | 'warn' | 'error';

export interface ErrorInformation {
  detail?: Error | string;
  [key: string]: unknown;
}

export enum ErrorCategory {
  BadRequest = 'BAD_REQUEST',
  Conflict = 'CONFLICT',
  Technical = 'TECHNICAL',
}

export enum ErrorType {
  BadRequest = 'BAD_REQUEST',
  TooManyRequests = 'TOO_MANY_REQUESTS',
  ForbiddenAccess = 'FORBIDDEN_ACCESS',
  Unauthenticated = 'UNAUTHENTICATED',
  UnknownError = 'UNKNOWN_ERROR',
  StillReference = 'STILL_REFERENCED',
  AlreadyExists = 'ALREADY_EXISTS',
  NotFound = 'NOT_FOUND',
}

export type CustomApolloError = ApolloError & {
  _logLevel?: ErrorLogLevel;
  // `http` sets the status of the HTTP response (Apollo Server)
  extensions?: { code?: string; http?: { status: number } };
  data: {
    genre?: ErrorCategory;
    http_status?: number;
  };
};
