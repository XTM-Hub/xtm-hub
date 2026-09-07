import { ApolloServer } from '@apollo/server';
import { unwrapResolverError } from '@apollo/server/errors';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { expressMiddleware } from '@as-integrations/express5';
import pkg from 'body-parser';
import cors from 'cors';
import express from 'express';

import config from 'config';
import promBundle from 'express-prom-bundle';
import expressSession, { SessionData } from 'express-session/index.js';
import { createHandler } from 'graphql-sse/lib/use/express';
import graphqlUploadExpress from 'graphql-upload/graphqlUploadExpress.mjs';
import { printSchema } from 'graphql/utilities/index.js';
import { createServer } from 'http';
import fs from 'node:fs';
import { v4 as uuidv4 } from 'uuid';
import { dbMigration } from '../knexfile';
import portalConfig from './config';
import { requestContext } from './context/request.context';
import { initCronJobs, stopCronJobs } from './crons';
import { PortalContext } from './model/portal-context';
import { UserLoadUserBy } from './model/user';
import { DeploymentRequestDataLoader } from './modules/deployment/deployment.dataloader';
import { documentDownloadEndpoint } from './modules/document/document-download-endpoint';
import { DocumentDataLoader } from './modules/document/document.dataloader';
import { documentVisualizeEndpoint } from './modules/document/visualize-document-endpoint';
import { NewsFeedDataLoader } from './modules/news-feed/news-feed.dataloader';
import { initAuthPlatform } from './modules/security-management/authentication/auth-platform';
import { ServiceInstanceDataLoader } from './modules/service/instance/service-instance.dataloader';
import { TelemetrySnapshotApp } from './modules/telemetry/telemetry-snapshot.app';
import { errorLoggingPlugin } from './server/apollo-plugins/log';
import {
  operationMetricsPlugin,
  sseActiveConnectionsGauge,
  sseMessageCounter,
  sseSubscriptionCounter,
} from './server/apollo-plugins/metrics';
import { healthEndpoint } from './server/endpoints/health';
import { manifestEndpoint } from './server/endpoints/manifest-endpoint';
import { productVersionEndpoint } from './server/endpoints/product-version-endpoint';
import { userPictureEndpoint } from './server/endpoints/user-picture-endpoint';
import createSchema from './server/graphql-schema';
import platformInit, { minioInit } from './server/initialize';
import { seedDevelopmentConnectors } from './server/initialize.helper';
import { getSessionStoreInstance } from './session-store-manager';
import { initShutdown, registerShutdownHook } from './shutdown';
import { runESMigrations } from './thirdparty/elasticsearch/migrate';
import { PgBossApp } from './thirdparty/pgboss/pgboss';
import { logApp } from './utils/app-logger.util';
import { getErrorStringProperty } from './utils/error/error-guard.util';
import {
  startSessionCleanup,
  stopSessionCleanup,
} from './utils/session-cleanup';
import { extractId } from './utils/utils';
const { json } = pkg;
// region GraphQL server initialization

const portalCookieName = portalConfig.session.name;
const portalCookieSecret = portalConfig.session.secret;
if (!portalCookieName || portalCookieName === 'changeMe') {
  throw new Error(
    'Invalid session secret configuration: set PORTAL_COOKIE_NAME'
  );
}
if (!portalCookieSecret || portalCookieSecret === 'changeMe') {
  throw new Error(
    'Invalid session secret configuration: set PORTAL_COOKIE_SECRET'
  );
}

const PORTAL_GRAPHQL_PATH = '/graphql-api';
const PORTAL_WEBSOCKET_PATH = '/graphql-sse';
const PORTAL_CORS_ALLOWED_ORIGINS: string[] = [
  'https://hub.prerelease.filigran.io',
  'https://hub.filigran.io',
] as const;

const PORTAL_CORS_OPTIONS: cors.CorsOptions = {
  origin: (origin, callback) => {
    const isDevelopmentEnvironment = portalConfig.environment === 'development';
    if (isDevelopmentEnvironment) {
      callback(null, true);
      return;
    }

    const isOriginAllowed =
      !origin || PORTAL_CORS_ALLOWED_ORIGINS.includes(origin);
    if (isOriginAllowed) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: true,
};

const app = express();
const SESSION_MAX_AGE = 24 * 60 * 60 * 1000; // 1 day
const sessionMiddleware = expressSession({
  name: portalCookieName,
  store: getSessionStoreInstance(),
  secret: portalCookieSecret,
  saveUninitialized: false,
  proxy: true,
  rolling: false,
  resave: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: portalConfig.environment !== 'development',
    maxAge: SESSION_MAX_AGE,
  },
});
// Default express.json() limit (100kb) is too small for GraphQL mutations
// carrying an inline base64 payload (e.g. a single connector logo ingested
// via ingestManifestFragments - some logos alone are several MB), so it is
// raised here for the whole API.
app.use(express.json({ limit: '7mb' }));
app.use(sessionMiddleware);
// Force maxAge on every request so that sessions created before the maxAge
// configuration (stored with originalMaxAge: null / expires: null) also
// receive a proper Expires / Max-Age header instead of being treated as
// session cookies by the browser.
app.use((req, _res, next) => {
  if (req.session?.cookie) {
    const cookie = req.session.cookie;
    if (cookie.originalMaxAge == null && cookie.expires == null) {
      cookie.maxAge = SESSION_MAX_AGE;
    }
  }
  next();
});

// Prometheus metrics
const metricsMiddleware = promBundle({
  customLabels: {
    app: 'xtm-hub-api',
  },
});
app.use(metricsMiddleware);

/*
Encountered an unexpected behavior within the express-session middleware.
The chunk parameter passed to the res.end() function is sometimes a function
instead of the expected data.
This function, when executed, returns undefined.
To prevent potential issues, calling the function before unsubscribing
from the GraphQL SSE stream ensures
that the correct data is obtained and sent as the event.

Additionally, we need to handle the case where the response stream is already destroyed
to prevent ERR_STREAM_DESTROYED errors when clients disconnect unexpectedly.
 */
app.use(function (req, res, next) {
  const originalEnd = res.end;
  const originalWrite = res.write;

  // Track if the response has been destroyed
  let isDestroyed = false;

  // Listen for response close/finish events
  res.on('close', () => {
    isDestroyed = true;
  });

  res.on('finish', () => {
    isDestroyed = true;
  });

  // Override write to check if stream is destroyed
  res.write = function (
    chunk: unknown,
    encoding?: BufferEncoding | ((error?: Error | null) => void),
    callback?: (error?: Error | null) => void
  ) {
    if (isDestroyed || res.destroyed || res.writableEnded) {
      // Silently ignore writes to destroyed streams
      logApp.debug('Attempted to write to destroyed stream, ignoring');
      return true;
    }
    try {
      if (typeof encoding === 'function') {
        return (originalWrite as (...args: unknown[]) => boolean).call(
          this,
          chunk,
          encoding
        );
      }
      return (originalWrite as (...args: unknown[]) => boolean).call(
        this,
        chunk,
        encoding,
        callback
      );
    } catch (error) {
      if (getErrorStringProperty(error, 'code') === 'ERR_STREAM_DESTROYED') {
        logApp.debug('Stream destroyed during write, ignoring');
        return true;
      }
      throw error;
    }
  };

  res.end = function (
    chunk?: unknown,
    encoding?: BufferEncoding | ((error?: Error | null) => void),
    callback?: (error?: Error | null) => void
  ) {
    if (isDestroyed || res.destroyed || res.writableEnded) {
      // Silently ignore end calls on destroyed streams
      logApp.debug('Attempted to end destroyed stream, ignoring');
      return this;
    }
    if (typeof chunk === 'function') {
      try {
        chunk();
      } catch (error) {
        logApp.error('Error executing chunk function', { error });
      }
      return this;
    }
    try {
      if (typeof encoding === 'function') {
        return (originalEnd as (...args: unknown[]) => typeof this).call(
          this,
          chunk,
          encoding
        );
      }
      return (originalEnd as (...args: unknown[]) => typeof this).call(
        this,
        chunk,
        encoding,
        callback
      );
    } catch (error) {
      if (getErrorStringProperty(error, 'code') === 'ERR_STREAM_DESTROYED') {
        logApp.debug('Stream destroyed during end, ignoring');
        return this;
      }
      throw error;
    }
  };
  next();
});
const httpServer = createServer(app);
const schema = createSchema();
app.use(graphqlUploadExpress());

if (
  !['production', 'staging', 'development'].includes(process.env.NODE_ENV ?? '')
) {
  const printedSchema = printSchema(schema);
  fs.writeFileSync('../frontend/schema.graphql', printedSchema);
}

app.use(function (req, res, next) {
  const forwardedFor = req.headers['x-forwarded-for'];
  const forwardedForIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(',')[0]?.trim();
  requestContext.run(
    {
      user: req.session.user,
      correlationId: uuidv4(),
      userAgent: req.headers['user-agent'],
      ip: forwardedForIp || req.ip,
      referer: req.headers.referer,
      organizationId: req.session.user?.selected_organization_id,
    },
    () => {
      next();
    }
  );
});

// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
// const drainPlugin = {
//     async serverWillStart() {
//         return Promise.resolve({
//             async drainServer() {
//                 await serverCleanup.dispose();
//             },
//         });
//     },
// }
const server = new ApolloServer<PortalContext>({
  schema,
  csrfPrevention: true,
  formatError: (formattedError, error) => {
    // Otherwise Apollo overrides extensions code with INTERNAL_SERVER_ERROR
    const originalError = unwrapResolverError(error);
    const code = (originalError as { extensions?: { code?: string } } | null)
      ?.extensions?.code;
    if (code) {
      return {
        ...formattedError,
        extensions: { ...formattedError.extensions, code },
      };
    }
    return formattedError;
  },
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    ...(process.env.NODE_ENV !== 'production'
      ? [
          ApolloServerPluginLandingPageLocalDefault({
            includeCookies: true,
            variables: {},
          }),
        ]
      : [ApolloServerPluginLandingPageDisabled()]),

    errorLoggingPlugin(),
    operationMetricsPlugin,
  ],
  introspection: process.env.NODE_ENV !== 'production', // Disable introspection in production env
});

// Note you must call `start()` on the `ApolloServer`
// instance before passing the instance to `expressMiddleware`
await server.start();

// Specify the path where we'd like to mount our server
declare module 'express-session' {
  // noinspection JSUnusedGlobalSymbols
  interface SessionData {
    user: UserLoadUserBy;
    referer: string;
  }
}

const middlewareExpress = expressMiddleware(server, {
  context: async ({ req, res }) => {
    const { user } = req.session;
    // extract id, only done for request with id directly
    if (req?.body?.variables?.id) {
      req.body.variables.id = extractId(req.body.variables.id);
    }

    // TODO Add build session from request authorization

    // user may be undefined for unauthenticated requests;
    // the @auth directive enforces authentication before any resolver accesses it.
    const portalContext: PortalContext = {
      user: user as UserLoadUserBy,
      req,
      res,
      dataLoaders: {
        deploymentRequest: DeploymentRequestDataLoader.create(),
        document: DocumentDataLoader.create(),
        newsFeed: NewsFeedDataLoader.create(),
        serviceInstance: ServiceInstanceDataLoader.create(),
      },
    };

    return portalContext;
  },
});
const handler = createHandler({
  schema,
  context: async (_req) => {
    const session = await new Promise((resolve) => {
      sessionMiddleware(_req.raw, {} as express.Response, () =>
        resolve(_req.raw.session)
      );
    });
    const { user } = session as SessionData;
    // if (!user) throw new GraphQLError("You must be logged in", { extensions: { code: 'UNAUTHENTICATED' } });
    // TODO Add build session from request authorization
    return { user, req: _req };
  },

  onConnect: async (req) => {
    sseActiveConnectionsGauge.inc({
      subscription: req.context.res.req.body?.operationName ?? 'Unknown',
    });
  },
  onComplete: async (_ctx, msg) => {
    sseActiveConnectionsGauge.dec({
      subscription: msg.context.res.req.body?.operationName ?? 'Unknown',
    });
  },
  onSubscribe: async (_ctx, msg) => {
    sseSubscriptionCounter.inc({
      subscription: msg.operationName ?? 'Unknown',
    });
  },
  onNext: async (_ctx, req) => {
    sseMessageCounter.inc({
      subscription: req.context.res.req.body?.operationName ?? 'Unknown',
    });
  },
});

app.use(
  PORTAL_WEBSOCKET_PATH,
  cors<cors.CorsRequest>(PORTAL_CORS_OPTIONS),
  json(),
  handler
);
app.use(
  PORTAL_GRAPHQL_PATH,
  sessionMiddleware,
  cors<cors.CorsRequest>(PORTAL_CORS_OPTIONS),
  json(),
  middlewareExpress
);

// endregion

await initAuthPlatform(app);
// This /storage/get route is implemented here because the GraphQL resolver cannot return a document directly.
// It lacks the level of abstraction needed to attach a file to the response (using res.attachment).
// Therefore, we have to handle it through this route instead.
documentDownloadEndpoint(app);
documentVisualizeEndpoint(app);
healthEndpoint(app);
userPictureEndpoint(app);
manifestEndpoint(app);
productVersionEndpoint(app);
// Modified server startup
if (!process.env.VITEST_MODE || process.env.START_DEV_SERVER) {
  // Ensure migrate the schema
  await dbMigration.migrate();

  await runESMigrations();

  await platformInit();

  // Must run before any seeding step that uploads files (e.g. connector logos),
  // otherwise uploads fail with "NoSuchBucket".
  await minioInit();
  logApp.debug('[MinIO] Bucket ready');

  const baseURLFront: string = config.get('base_url_front');
  if (
    process.env.DATA_SEEDING ||
    (portalConfig.environment === 'development' &&
      !baseURLFront.includes('https://dev.hub.staging.filigran.io'))
  ) {
    logApp.info('[SEEDING] Running development seeds...');
    await dbMigration.seed();
    logApp.info('[SEEDING] Development seeds completed');

    await seedDevelopmentConnectors();
  }

  logApp.info(
    '[Migration] Database version is now ' + (await dbMigration.version())
  );

  await PgBossApp.start();

  startSessionCleanup();

  await new Promise<void>((resolve) =>
    httpServer.listen({ port: portalConfig.port }, resolve)
  );

  initCronJobs();

  // Anonymous usage gauge telemetry (fire-and-forget: probes the collector
  // and self-disables when unreachable, never blocks or breaks the boot).
  void TelemetrySnapshotApp.start();

  // Centralized graceful shutdown — registers SIGTERM, SIGINT,
  // uncaughtException and unhandledRejection handlers.
  // The HTTP server hook is registered inside initShutdown.
  initShutdown(httpServer);
  registerShutdownHook('pg-boss', async () => PgBossApp.stop());
  registerShutdownHook('session-cleanup', async () => stopSessionCleanup());
  registerShutdownHook('cron-jobs', async () => stopCronJobs());
  registerShutdownHook('gauge-telemetry', async () =>
    TelemetrySnapshotApp.stop()
  );
  registerShutdownHook('apollo-server', async () => {
    await server.stop();
  });
}

logApp.info(
  `🚀 Server ready at http://localhost:${portalConfig.port} (ENV: ${portalConfig.environment})`
);
