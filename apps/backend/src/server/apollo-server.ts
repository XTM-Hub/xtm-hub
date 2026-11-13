import { ApolloServer } from '@apollo/server';
import {
  ApolloServerErrorCode,
  unwrapResolverError,
} from '@apollo/server/errors';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { isInstance as isCustomApolloError } from 'apollo-errors';
import type { GraphQLFormattedError, GraphQLSchema } from 'graphql';
import { Server } from 'http';
import { ErrorCode, UnknownErrorCode } from '../utils/error/error.code';
import { Context, errorLoggingPlugin } from './apollo-plugins/log';
import { operationMetricsPlugin } from './apollo-plugins/metrics';
import { QUERY_LIMIT_RULES } from './graphql-query-limits';
import { removeSuggestionHint } from './schema-details';

const REQUEST_ERROR_CODES = new Set<string>(
  Object.values(ApolloServerErrorCode).filter(
    (code) => code !== ApolloServerErrorCode.INTERNAL_SERVER_ERROR
  )
);
const CLIENT_ERROR_MESSAGES = new Set<string>([
  ...Object.values(ErrorCode),
  ...Object.values(UnknownErrorCode),
]);

const isClientSafeError = (
  formattedError: GraphQLFormattedError,
  originalError: unknown
) => {
  if (!formattedError.path) {
    const code = formattedError.extensions?.code;
    return typeof code === 'string' && REQUEST_ERROR_CODES.has(code);
  }
  return (
    isCustomApolloError(originalError) ||
    (originalError instanceof Error &&
      CLIENT_ERROR_MESSAGES.has(originalError.message))
  );
};

interface CreateApolloServerOptions {
  schema: GraphQLSchema;
  // Introspection, landing page, stack traces and graphql-js "Did you mean" hints all reveal the schema
  exposeSchemaDetails: boolean;
  httpServer?: Server;
}

export const createApolloServer = ({
  schema,
  exposeSchemaDetails,
  httpServer,
}: CreateApolloServerOptions) =>
  new ApolloServer<Context>({
    schema,
    csrfPrevention: true,
    validationRules: QUERY_LIMIT_RULES,
    introspection: exposeSchemaDetails,
    includeStacktraceInErrorResponses: exposeSchemaDetails,
    formatError: (formattedError, error) => {
      const originalError = unwrapResolverError(error);
      if (!isClientSafeError(formattedError, originalError)) {
        return {
          message: UnknownErrorCode.UnknownError,
          locations: formattedError.locations,
          path: formattedError.path,
          extensions: { code: UnknownErrorCode.UnknownError },
        };
      }
      const message = exposeSchemaDetails
        ? formattedError.message
        : removeSuggestionHint(formattedError.message);
      // Otherwise Apollo overrides extensions code with INTERNAL_SERVER_ERROR
      const code = (originalError as { extensions?: { code?: string } } | null)
        ?.extensions?.code;
      if (code) {
        return {
          ...formattedError,
          message,
          extensions: { ...formattedError.extensions, code },
        };
      }
      return { ...formattedError, message };
    },
    plugins: [
      ...(httpServer
        ? [ApolloServerPluginDrainHttpServer({ httpServer })]
        : []),
      exposeSchemaDetails
        ? ApolloServerPluginLandingPageLocalDefault({
            includeCookies: true,
            variables: {},
          })
        : ApolloServerPluginLandingPageDisabled(),
      errorLoggingPlugin(),
      operationMetricsPlugin,
    ],
  });
