import { ApolloServerPlugin, BaseContext } from '@apollo/server';
import type { Request, Response } from 'express';
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

// Threat Pulse batches carry up to thousands of pseudonymous hashes: logging
// them adds volume and keeps linkable material in log storage.
const REDACTED_VARIABLES_FIELDS = /\b(pushPulse|pulseLookup)\b/;
export const REDACTED_VARIABLES = '[redacted]';

export const loggableVariables = (
  query: string | undefined,
  variables: unknown
): unknown =>
  query && REDACTED_VARIABLES_FIELDS.test(query)
    ? REDACTED_VARIABLES
    : variables;

export const errorLoggingPlugin = (): ApolloServerPlugin<Context> => ({
  async requestDidStart(requestContext) {
    const { request, contextValue } = requestContext;
    const { user, serviceId, req } = contextValue ?? {};

    logApp.info(
      'GraphQL request received',
      {
        operationName: request.operationName,
        query: request.query,
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

          logApp[logLevel](
            error.message,
            {
              path: error.path,
              locations: error.locations,
              operationName,
              user: contextValue?.user,
              serviceId: contextValue?.serviceId,
              codeStack: error.originalError?.stack,
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
