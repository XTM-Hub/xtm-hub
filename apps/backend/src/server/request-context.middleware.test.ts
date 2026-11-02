import express, { type Request, type Response } from 'express';
import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requestContext } from '../context/request.context';
import { parseTrustProxy } from '../utils/config-validation.util';
import { requestContextMiddleware } from './request-context.middleware';

const CLIENT_IP = '198.51.100.20';
const FORGED_IP = '203.0.113.7';
const LOOPBACK_IP = '127.0.0.1';

const startServer = async (trustProxy: number | false) => {
  const app = express();
  app.set('trust proxy', trustProxy);
  app.use((req, _res, next) => {
    req.session = {} as Request['session'];
    next();
  });
  app.use(requestContextMiddleware);
  app.get('/ip', (req, res) => {
    res.json({ contextIp: requestContext.get()?.ip, reqIp: req.ip });
  });
  // Bound to IPv4 so the socket peer is always the plain loopback address.
  const server = app.listen(0, LOOPBACK_IP);
  await once(server, 'listening');
  const { port } = server.address() as AddressInfo;
  return { server, url: `http://${LOOPBACK_IP}:${port}/ip` };
};

const getIps = async (url: string, forwardedFor?: string) =>
  (await (
    await fetch(url, {
      headers: forwardedFor ? { 'x-forwarded-for': forwardedFor } : {},
    })
  ).json()) as { contextIp?: string; reqIp?: string };

describe('requestContextMiddleware', () => {
  // The only test independent of trust proxy: it pins the context IP to req.ip itself.
  it('should take the context IP from req.ip when X-Forwarded-For carries a forged leftmost entry', () => {
    // Given
    const req = {
      ip: CLIENT_IP,
      headers: { 'x-forwarded-for': `${FORGED_IP}, ${CLIENT_IP}` },
      session: {},
    } as unknown as Request;
    const next = vi.fn(() => requestContext.get());

    // When
    requestContextMiddleware(req, {} as Response, next);

    // Then
    expect(next).toHaveReturnedWith(expect.objectContaining({ ip: CLIENT_IP }));
  });

  describe('behind one trusted proxy', () => {
    let server: Server | undefined;
    let url: string;

    beforeEach(async () => {
      ({ server, url } = await startServer(parseTrustProxy('1')));
    });

    afterEach(async () => {
      await new Promise((resolve) => server?.close(resolve));
    });

    it('should resolve the rightmost entry when X-Forwarded-For carries a forged leftmost one', async () => {
      // Given
      const forwardedFor = `${FORGED_IP}, ${CLIENT_IP}`;

      // When
      const ips = await getIps(url, forwardedFor);

      // Then
      expect(ips).toEqual({ contextIp: CLIENT_IP, reqIp: CLIENT_IP });
    });

    it('should keep the IPv4-mapped form when the rightmost entry is IPv4-mapped', async () => {
      // Given
      const forwardedFor = `${FORGED_IP}, ::ffff:${CLIENT_IP}`;

      // When
      const ips = await getIps(url, forwardedFor);

      // Then
      expect(ips).toEqual({
        contextIp: `::ffff:${CLIENT_IP}`,
        reqIp: `::ffff:${CLIENT_IP}`,
      });
    });

    it('should fall back to the socket peer when X-Forwarded-For is absent', async () => {
      // Given
      const forwardedFor = undefined;

      // When
      const ips = await getIps(url, forwardedFor);

      // Then
      expect(ips).toEqual({ contextIp: LOOPBACK_IP, reqIp: LOOPBACK_IP });
    });
  });

  describe('with no trusted proxy', () => {
    let server: Server | undefined;
    let url: string;

    beforeEach(async () => {
      // Same value the API gets in local dev, where LOCAL_DEV=true trusts no proxy.
      ({ server, url } = await startServer(parseTrustProxy('0')));
    });

    afterEach(async () => {
      await new Promise((resolve) => server?.close(resolve));
    });

    it('should ignore a forged X-Forwarded-For and keep the socket peer', async () => {
      // Given
      const forwardedFor = `${FORGED_IP}, ${CLIENT_IP}`;

      // When
      const ips = await getIps(url, forwardedFor);

      // Then
      expect(ips).toEqual({ contextIp: LOOPBACK_IP, reqIp: LOOPBACK_IP });
    });
  });
});
