import express from 'express';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configureTrustedProxy } from './ip-rate-limit.util';

const CLIENT_IP = '198.51.100.23';
const FORGED_IP = '203.0.113.7';

describe('configureTrustedProxy', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    configureTrustedProxy(app);
    app.get('/ip', (req, res) => {
      res.json({ ip: req.ip });
    });
    server = createServer(app);
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve)
    );
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const loadIp = async (forwardedFor?: string): Promise<string> => {
    const response = await fetch(`${baseUrl}/ip`, {
      headers: forwardedFor ? { 'x-forwarded-for': forwardedFor } : {},
    });
    return ((await response.json()) as { ip: string }).ip;
  };

  it('should use the address forwarded by the proxy as the client IP', async () => {
    // When
    const ip = await loadIp(CLIENT_IP);

    // Then
    expect(ip).toBe(CLIENT_IP);
  });

  it('should ignore the forwarded addresses that a client can forge', async () => {
    // When
    const ip = await loadIp(`${FORGED_IP}, ${CLIENT_IP}`);

    // Then
    expect(ip).toBe(CLIENT_IP);
  });

  it('should use the connection address when nothing is forwarded', async () => {
    // When
    const ip = await loadIp();

    // Then
    expect(ip).toMatch(/127\.0\.0\.1$/);
  });
});
