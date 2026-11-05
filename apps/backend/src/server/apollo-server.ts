import { ApolloServer } from '@apollo/server';
import { unwrapResolverError } from '@apollo/server/errors';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import type { GraphQLSchema } from 'graphql';
import { Server } from 'http';
import { Context, errorLoggingPlugin } from './apollo-plugins/log';
import { operationMetricsPlugin } from './apollo-plugins/metrics';
import { removeSuggestionHint } from './schema-details';

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
    introspection: exposeSchemaDetails,
    includeStacktraceInErrorResponses: exposeSchemaDetails,
    formatError: (formattedError, error) => {
      const message = exposeSchemaDetails
        ? formattedError.message
        : removeSuggestionHint(formattedError.message);
      // Otherwise Apollo overrides extensions code with INTERNAL_SERVER_ERROR
      const originalError = unwrapResolverError(error);
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
