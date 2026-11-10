import express from 'express';
import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { securityHeadersMiddleware } from './security-headers.middleware';

const LOOPBACK_IP = '127.0.0.1';

describe('securityHeadersMiddleware', () => {
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    const app = express();
    app.use(securityHeadersMiddleware);
    app.get('/file', (_req, res) => {
      res
        .type('image/svg+xml')
        .send('<svg xmlns="http://www.w3.org/2000/svg"/>');
    });
    server = app.listen(0, LOOPBACK_IP);
    await once(server, 'listening');
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://${LOOPBACK_IP}:${port}`;
  });

  afterEach(() => {
    server.close();
  });

  it.each`
    description          | path
    ${'a served file'}   | ${'/file'}
    ${'an unknown path'} | ${'/unknown'}
  `(
    'should forbid content sniffing on $description',
    async ({ path }: { path: string }) => {
      // When
      const response = await fetch(`${baseUrl}${path}`);

      // Then
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    }
  );
});
