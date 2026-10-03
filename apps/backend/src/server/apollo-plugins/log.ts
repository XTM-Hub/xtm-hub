import { ApolloServerPlugin, BaseContext } from '@apollo/server';
import type { Request, Response } from 'express';
import type { GraphQLError } from 'graphql';
import type { UserLoadUserBy } from '../../model/user';
import { AppLogsCategory, logApp } from '../../utils/app-logger.util';
import type {
  CustomApolloError,
  ErrorLogLevel,
} from '../../utils/error/error.type';

export interface Context extends BaseContext {
  user: UserLoadUserBy;
  req: Request;
  res: Response;
  serviceId?: string;
}

// Threat Pulse requests carry pseudonymous hashes, and a malformed one can
// carry raw values: their query text, variables, error messages and stacks
// (GraphQL coercion errors echo the rejected input) never reach the logs.
// Every Threat Pulse field is `pushPulse` or `pulse<Name>`: a new operation is
// covered without being listed (log.test.ts checks each field of the schema).
const PULSE_OPERATION_FIELDS = /\b(pushPulse|pulse[A-Z]\w*)\b/;
export const REDACTED = '[redacted]';
export const REDACTED_PULSE_ERROR_MESSAGE = 'Threat Pulse request failed';

// A request without query text (an automatic persisted query sent as a hash
// only) cannot be classified, so it is redacted as well.
export const isRedactedOperation = (query: string | undefined): boolean =>
  !query || PULSE_OPERATION_FIELDS.test(query);

export const loggableVariables = (
  query: string | undefined,
  variables: unknown
): unknown => (isRedactedOperation(query) ? REDACTED : variables);

export const loggableQuery = (query: string | undefined): string | undefined =>
  isRedactedOperation(query) ? REDACTED : query;

// The operation name and the field aliases of an error path are chosen by the
// client, so a hash can travel in them as well.
export const loggableOperationName = (
  query: string | undefined,
  operationName: string | null | undefined
): string | null | undefined =>
  isRedactedOperation(query) ? REDACTED : operationName;

export const loggablePath = (
  query: string | undefined,
  path: GraphQLError['path']
): GraphQLError['path'] => (isRedactedOperation(query) ? undefined : path);

const errorLogEntry = (
  error: GraphQLError,
  query: string | undefined
): { message: string; codeStack: string | undefined; code: unknown } =>
  isRedactedOperation(query)
    ? {
        message: REDACTED_PULSE_ERROR_MESSAGE,
        codeStack: undefined,
        code: error.extensions?.code,
      }
    : {
        message: error.message,
        codeStack: error.originalError?.stack,
        code: error.extensions?.code,
      };

export const errorLoggingPlugin = (): ApolloServerPlugin<Context> => ({
  async requestDidStart(requestContext) {
    const { request, contextValue } = requestContext;
    const { user, serviceId, req } = contextValue ?? {};

    logApp.info(
      'GraphQL request received',
      {
        operationName: loggableOperationName(
          request.query,
          request.operationName
        ),
        query: loggableQuery(request.query),
        variables: loggableVariables(request.query, req?.body?.variables),
        user,
        serviceId,
      },
      AppLogsCategory.GRAPHQL
    );

    return {
      async didEncounterErrors(requestContext) {
        const { errors, operationName, contextValue, request } = requestContext;

        errors.forEach((error) => {
          const logLevel: ErrorLogLevel =
            (error.originalError as CustomApolloError | null)?._logLevel ??
            'error';
          const { message, codeStack, code } = errorLogEntry(
            error,
            request.query
          );

          logApp[logLevel](
            message,
            {
              path: loggablePath(request.query, error.path),
              locations: error.locations,
              code,
              operationName: loggableOperationName(
                request.query,
                operationName
              ),
              user: contextValue?.user,
              serviceId: contextValue?.serviceId,
              codeStack,
              variables: loggableVariables(
                request.query,
                contextValue?.req?.body?.variables
              ),
            },
            AppLogsCategory.GRAPHQL
          );
        });
      },
    };
  },
});
