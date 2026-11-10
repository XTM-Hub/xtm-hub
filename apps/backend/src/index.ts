import { expressMiddleware } from '@as-integrations/express5';
import pkg from 'body-parser';
import cors from 'cors';
import express from 'express';

import config from 'config';
import promBundle from 'express-prom-bundle';
import { SessionData } from 'express-session/index.js';
import { createHandler } from 'graphql-sse/lib/use/express';
import graphqlUploadExpress from 'graphql-upload/graphqlUploadExpress.mjs';
import { printSchema } from 'graphql/utilities/index.js';
import { createServer } from 'http';
import fs from 'node:fs';
import { dbMigration } from '../knexfile';
import portalConfig from './config';
import { initCronJobs, stopCronJobs } from './crons';
import { PortalContext } from './model/portal-context';
import { UserLoadUserBy } from './model/user';
import { DeploymentRequestDataLoader } from './modules/deployment/deployment.dataloader';
import { DocumentDataLoader } from './modules/document/document.dataloader';
import { FeatureVotingDataLoader } from './modules/feature-voting/feature-voting.dataloader';
import { NewsFeedDataLoader } from './modules/news-feed/news-feed.dataloader';
import { OrganizationDataLoader } from './modules/organization-management/organization/organization.dataloader';
import { RegistrationDataLoader } from './modules/registration/registration.dataloader';
import { initAuthPlatform } from './modules/security-management/authentication/auth-platform';
import { ServiceInstanceDataLoader } from './modules/service/instance/service-instance.dataloader';
import { SubscriptionDataLoader } from './modules/subscription/subscription.dataloader';
import { TelemetrySnapshotApp } from './modules/telemetry/telemetry-snapshot.app';
import { sseOperationMetrics } from './server/apollo-plugins/metrics';
import { createApolloServer } from './server/apollo-server';
import {
  registerEndpoints,
  registerReadOnlySessionEndpoints,
} from './server/endpoints';
import createSchema from './server/graphql-schema';
import platformInit, { minioInit } from './server/initialize';
import { seedDevelopmentConnectors } from './server/initialize.helper';
import { requestContextMiddleware } from './server/request-context.middleware';
import { createSseSchemaDetailsOptions } from './server/schema-details';
import {
  createSessionMiddlewares,
  SESSION_MAX_AGE,
} from './server/session/session.middleware';
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
app.set('trust proxy', portalConfig.trust_proxy);
logApp.info('[TRUST-PROXY] Express trust proxy set', {
  trustProxy: portalConfig.trust_proxy,
});
const { sessionMiddleware, readOnlySessionMiddleware } =
  createSessionMiddlewares({
    name: portalCookieName,
    secret: portalCookieSecret,
    store: getSessionStoreInstance(),
  });
// Default express.json() limit (100kb) is too small for GraphQL mutations
// carrying an inline base64 payload (e.g. a single connector logo ingested
// via ingestManifestFragments - some logos alone are several MB), so it is
// raised here for the whole API.
app.use(express.json({ limit: '7mb' }));
// Prometheus metrics. Before the session middleware, so that the routes registered before it are measured too
const metricsMiddleware = promBundle({
  customLabels: {
    app: 'xtm-hub-api',
  },
});
app.use(metricsMiddleware);
// Before the session middleware, which would renew the session of a logged in user on every request
registerReadOnlySessionEndpoints(app, readOnlySessionMiddleware);
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

app.use(requestContextMiddleware);

const server = createApolloServer({
  schema,
  httpServer,
  exposeSchemaDetails: portalConfig.local_dev,
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
    // Auth0 account refused for an unverified email, used to resend the email
    unverifiedIdpSubject: string;
    // A failed sign-in was started again, which happens once only
    signInRestarted: boolean;
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
        featureVoting: FeatureVotingDataLoader.create(),
        newsFeed: NewsFeedDataLoader.create(),
        organization: OrganizationDataLoader.create(),
        registration: RegistrationDataLoader.create(),
        serviceInstance: ServiceInstanceDataLoader.create(),
        subscription: SubscriptionDataLoader.create(),
      },
    };

    return portalContext;
  },
});
const sseSchemaDetailsOptions = createSseSchemaDetailsOptions(
  portalConfig.local_dev
);
const handler = createHandler({
  schema,
  ...sseSchemaDetailsOptions,
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

  onOperation: (ctx, _req, args) => {
    sseOperationMetrics.onOperation(ctx, args);
  },
  onNext: async (ctx, req, result) => {
    sseOperationMetrics.onNext(ctx);
    return sseSchemaDetailsOptions.onNext?.(ctx, req, result);
  },
  onComplete: (ctx) => {
    sseOperationMetrics.onComplete(ctx);
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
registerEndpoints(app);
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
