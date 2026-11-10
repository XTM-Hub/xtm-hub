import express from 'express';
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { Registry } from 'prom-client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createHttpMetricsMiddleware,
  OTHER_METHOD_LABEL,
  UNMATCHED_PATH_LABEL,
} from './http-metrics.middleware';

const ROUTE_PATTERN = '/document/visualize/:serviceInstanceId/:filename';
const MOUNT_PATH = '/graphql-api';
const MADE_UP_ID = 'made-up-service-instance-id';
const MADE_UP_FILENAME = 'made-up-file.pdf';
const EXOTIC_METHOD = 'PROPFIND';

const startServer = async () => {
  const app = express();
  app.use(
    createHttpMetricsMiddleware({
      mountPaths: [MOUNT_PATH],
      promRegistry: new Registry(),
    })
  );
  app.get(ROUTE_PATTERN, (_req, res) => {
    res.sendStatus(200);
  });
  app.use(MOUNT_PATH, (_req, res) => {
    res.sendStatus(200);
  });
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  return server;
};

const getLabels = async (baseUrl: string, labelName: 'path' | 'method') => {
  const metrics = await (await fetch(`${baseUrl}/metrics`)).text();
  const labels = [
    ...metrics.matchAll(
      new RegExp(
        `^http_request_duration_seconds_count\\{[^}]*${labelName}="([^"]*)"`,
        'gm'
      )
    ),
  ].map(([, value]) => value);
  return { metrics, labels };
};

describe('createHttpMetricsMiddleware', () => {
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    server = await startServer();
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it.each([
    {
      context: 'a parameterized route is called with made-up values',
      requestPath: `/document/visualize/${MADE_UP_ID}/${MADE_UP_FILENAME}`,
      expectedLabel: ROUTE_PATTERN,
    },
    {
      context: 'the path matches no route',
      requestPath: `/${MADE_UP_ID}/${MADE_UP_FILENAME}`,
      expectedLabel: UNMATCHED_PATH_LABEL,
    },
    {
      context: 'a mounted handler is called with another casing and a subpath',
      requestPath: `/GraphQL-API/${MADE_UP_ID}`,
      expectedLabel: MOUNT_PATH,
    },
  ])(
    'should label the request with $expectedLabel when $context',
    async ({ requestPath, expectedLabel }) => {
      // Given a server measured by the HTTP metrics middleware
      // When a client calls the path
      await fetch(`${baseUrl}${requestPath}`);

      // Then the only path label is the fixed one
      const { labels } = await getLabels(baseUrl, 'path');
      expect(labels).toEqual([expectedLabel]);
    }
  );

  it('should never expose a value sent by the client when the metrics are read', async () => {
    // Given a server measured by the HTTP metrics middleware
    // When clients call a parameterized route, an unknown path and a mounted handler with made-up values
    await fetch(
      `${baseUrl}/document/visualize/${MADE_UP_ID}/${MADE_UP_FILENAME}`
    );
    await fetch(`${baseUrl}/${MADE_UP_FILENAME}`);
    await fetch(`${baseUrl}/GRAPHQL-API/${MADE_UP_ID}`);

    // Then none of these values appears in the metrics
    const { metrics } = await getLabels(baseUrl, 'path');
    expect(metrics).not.toMatch(/made-up|GRAPHQL-API/);
  });

  it('should label the request with other when the method is not a common one', async () => {
    // Given a server measured by the HTTP metrics middleware
    // When a client calls an unknown path with an exotic method
    await fetch(`${baseUrl}/${MADE_UP_ID}`, { method: EXOTIC_METHOD });

    // Then the only method label is the fixed one, never the method sent
    const { labels } = await getLabels(baseUrl, 'method');
    expect(labels).toEqual([OTHER_METHOD_LABEL]);
  });
});
