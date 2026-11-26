import express from 'express';
import { createHandler } from 'graphql-sse/lib/use/express';
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import createSchema from './graphql-schema';
import { createSseSchemaDetailsOptions } from './schema-details';

const DID_YOU_MEAN = 'Did you mean';
const SSE_PATH = '/graphql-sse';

const COERCION_MUTATION = `
  mutation ($input: AutoRegisterPlatformInput) {
    autoRegisterPlatform(input: $input) { success }
  }
`;

const HINT_PROBES = [
  {
    name: 'unknown field',
    query: 'mutation { autoRegisterPlatfrm }',
    variables: undefined,
  },
  {
    name: 'unknown enum value in the variables',
    query: COERCION_MUTATION,
    variables: {
      input: {
        platform: {
          id: 'p1',
          url: 'https://platform.test',
          title: 'Platform',
          contract: 'EEE',
        },
      },
    },
  },
];

const INTROSPECTION_QUERY = '{ __schema { queryType { name } } }';

const startSseServer = async (exposeSchemaDetails: boolean) => {
  const app = express();
  app.use(
    SSE_PATH,
    express.json(),
    createHandler({
      schema: createSchema(),
      ...createSseSchemaDetailsOptions(exposeSchemaDetails),
    })
  );
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  return { server, url: `http://127.0.0.1:${port}${SSE_PATH}` };
};

const stopSseServer = (server: Server) =>
  new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

const postRejectedOperationOverSingleConnection = async (
  url: string,
  query: string
) => {
  const token = 'single-connection-token';
  await fetch(url, {
    method: 'PUT',
    headers: { 'x-graphql-event-stream-token': token },
  });
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'x-graphql-event-stream-token': token,
    },
    body: JSON.stringify({ query, extensions: { operationId: 'op-1' } }),
  });
  return { status: response.status, body: await response.text() };
};

const postOperation = async (
  url: string,
  query: string,
  variables?: Record<string, unknown>
) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      accept: 'text/event-stream',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await response.text();
  const dataLine = body.split('\n').find((line) => line.startsWith('data:'));
  return {
    body,
    payload: JSON.parse(dataLine!.slice('data:'.length)) as {
      data?: unknown;
      errors?: { message: string }[];
    },
  };
};

describe('createSseSchemaDetailsOptions', () => {
  describe('when the schema details are hidden', () => {
    let server: Server;
    let url: string;

    beforeAll(async () => {
      ({ server, url } = await startSseServer(false));
    });

    afterAll(async () => {
      await stopSseServer(server);
    });

    it.each(HINT_PROBES)(
      'should not suggest schema names when the request has an $name',
      async ({ query, variables }) => {
        // Given a probe that makes graphql-js suggest a schema name

        // When
        const { body, payload } = await postOperation(url, query, variables);

        // Then
        expect(payload.errors?.length).toBeGreaterThan(0);
        expect(body).not.toContain(DID_YOU_MEAN);
      }
    );

    it('should keep the rest of the error message when the hint is removed', async () => {
      // Given
      const query = 'mutation { autoRegisterPlatfrm }';

      // When
      const { payload } = await postOperation(url, query);

      // Then
      expect(payload.errors?.[0]).toMatchObject({
        message: 'Cannot query field "autoRegisterPlatfrm" on type "Mutation".',
      });
    });

    it('should refuse an introspection query', async () => {
      // Given / When
      const { payload } = await postOperation(url, INTROSPECTION_QUERY);

      // Then
      expect(payload.data).toBeUndefined();
      expect(payload.errors?.[0].message).toContain('introspection');
    });

    it('should not suggest schema names when a single connection request is rejected', async () => {
      // Given
      const query = 'mutation { autoRegisterPlatfrm }';

      // When
      const { status, body } = await postRejectedOperationOverSingleConnection(
        url,
        query
      );

      // Then
      expect(status).toBe(400);
      expect(body).toContain('Cannot query field');
      expect(body).not.toContain(DID_YOU_MEAN);
    });
  });

  describe('when the schema details are exposed', () => {
    let server: Server;
    let url: string;

    beforeAll(async () => {
      ({ server, url } = await startSseServer(true));
    });

    afterAll(async () => {
      await stopSseServer(server);
    });

    it.each(HINT_PROBES)(
      'should suggest schema names when the request has an $name',
      async ({ query, variables }) => {
        // Given a probe that makes graphql-js suggest a schema name

        // When
        const { body } = await postOperation(url, query, variables);

        // Then
        expect(body).toContain(DID_YOU_MEAN);
      }
    );

    it('should answer an introspection query', async () => {
      // Given / When
      const { payload } = await postOperation(url, INTROSPECTION_QUERY);

      // Then
      expect(payload).toMatchObject({
        data: { __schema: { queryType: { name: 'Query' } } },
      });
    });

    it('should suggest schema names when a single connection request is rejected', async () => {
      // Given
      const query = 'mutation { autoRegisterPlatfrm }';

      // When
      const { status, body } = await postRejectedOperationOverSingleConnection(
        url,
        query
      );

      // Then
      expect(status).toBe(400);
      expect(body).toContain(DID_YOU_MEAN);
    });
  });
});
