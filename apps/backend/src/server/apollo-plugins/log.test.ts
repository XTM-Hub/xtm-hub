import type {
  GraphQLRequestContext,
  GraphQLRequestContextDidEncounterErrors,
  GraphQLRequestListener,
} from '@apollo/server';
import { GraphQLError } from 'graphql';
import { describe, expect, it, vi } from 'vitest';
import { logApp } from '../../utils/app-logger.util';
import {
  Context,
  errorLoggingPlugin,
  isRedactedOperation,
  loggableQuery,
  loggableVariables,
  REDACTED,
  REDACTED_PULSE_ERROR_MESSAGE,
} from './log';

const HASH = 'a1'.repeat(16);
const RAW_VALUE = 'evil.example.com';
const VARIABLES = { input: { day: '2026-10-03', hashes: [HASH] } };
const INLINE_PUSH = `mutation { pushPulse(input: { day: "2026-10-03", sector_bucket: finance, region_bucket: europe, records: [{ hash: "${HASH}", object_type: indicator, event_kind: created, count: 1, value: "${RAW_VALUE}" }] }) { accepted } }`;

const PULSE_QUERIES = [
  'mutation Push($input: PushPulseInput!) { pushPulse(input: $input) { accepted } }',
  'query Lookup($input: PulseLookupInput!) { pulseLookup(input: $input) { hash } }',
  'query { pulseTrending(input: { day: "2026-10-03", period: last_7_days }) { day } }',
  'query { pulseBenchmark(input: { platformId: "p", day: "2026-10-03", period: last_7_days }) { period } }',
  'query { pulseSalt(day: "2026-10-03") { salt } }',
  'query { pulseStatus { day } }',
  'mutation { pulsePurge(platformId: "p") { success } }',
];

type Plugin = ReturnType<typeof errorLoggingPlugin>;

const startRequest = async (
  query: string,
  variables: unknown
): Promise<GraphQLRequestListener<Context>> => {
  const plugin: Plugin = errorLoggingPlugin();
  const requestContext = {
    request: { query, operationName: undefined },
    contextValue: { req: { body: { variables } } },
  } as unknown as GraphQLRequestContext<Context>;
  const listener = await plugin.requestDidStart?.(requestContext);
  if (!listener) {
    throw new Error('The log plugin must return a request listener');
  }
  return listener;
};

const failRequest = async (
  listener: GraphQLRequestListener<Context>,
  query: string,
  variables: unknown,
  error: GraphQLError
): Promise<void> => {
  await listener.didEncounterErrors?.({
    errors: [error],
    operationName: null,
    request: { query },
    contextValue: { req: { body: { variables } } },
  } as unknown as GraphQLRequestContextDidEncounterErrors<Context>);
};

const coercionError = (): GraphQLError => {
  const original = new Error(
    `Variable "$input" got invalid value { hash: "${HASH}", value: "${RAW_VALUE}" }`
  );
  original.stack = `Error: ${original.message}\n    at coerce (graphql.js:1:1)`;
  return new GraphQLError(original.message, {
    originalError: original,
    extensions: { code: 'BAD_USER_INPUT' },
  });
};

describe('errorLoggingPlugin redaction', () => {
  it.each(PULSE_QUERIES)(
    'should redact every Threat Pulse operation: %s',
    (query) => {
      expect(isRedactedOperation(query)).toBe(true);
      expect(loggableQuery(query)).toBe(REDACTED);
      expect(loggableVariables(query, VARIABLES)).toBe(REDACTED);
    }
  );

  it('should keep the query and variables of another operation', () => {
    const query = 'query { me { id } }';
    expect(isRedactedOperation(query)).toBe(false);
    expect(loggableQuery(query)).toBe(query);
    expect(loggableVariables(query, VARIABLES)).toBe(VARIABLES);
  });

  it.each([
    { operation: 'no query', query: undefined },
    { operation: 'an empty query', query: '' },
  ])('should redact the variables of $operation', ({ query }) => {
    expect(isRedactedOperation(query)).toBe(true);
    expect(loggableQuery(query)).toBe(REDACTED);
    expect(loggableVariables(query, VARIABLES)).toBe(REDACTED);
  });

  it('should never log the variables of a hash-only persisted query', async () => {
    // Given
    const info = vi.spyOn(logApp, 'info').mockImplementation(() => undefined);
    const error = vi.spyOn(logApp, 'error').mockImplementation(() => undefined);
    const variables = {
      input: { day: '2026-10-03', hashes: [HASH], value: RAW_VALUE },
    };
    const plugin: Plugin = errorLoggingPlugin();
    const listener = await plugin.requestDidStart?.({
      request: {
        operationName: 'Lookup',
        extensions: {
          persistedQuery: { version: 1, sha256Hash: 'f0'.repeat(32) },
        },
      },
      contextValue: { req: { body: { variables } } },
    } as unknown as GraphQLRequestContext<Context>);

    // When
    await listener?.didEncounterErrors?.({
      errors: [coercionError()],
      operationName: 'Lookup',
      request: {},
      contextValue: { req: { body: { variables } } },
    } as unknown as GraphQLRequestContextDidEncounterErrors<Context>);

    // Then
    const logged = JSON.stringify([info.mock.calls, error.mock.calls]);
    expect(logged).not.toContain(HASH);
    expect(logged).not.toContain(RAW_VALUE);
    expect(info.mock.calls[0]?.[1]).toMatchObject({ variables: REDACTED });
    expect(error.mock.calls[0]?.[0]).toBe(REDACTED_PULSE_ERROR_MESSAGE);
    expect(error.mock.calls[0]?.[1]).toMatchObject({
      codeStack: undefined,
      variables: REDACTED,
    });
  });

  it('should never log the hashes or raw values of an inline pushPulse request', async () => {
    // Given
    const info = vi.spyOn(logApp, 'info').mockImplementation(() => undefined);

    // When
    await startRequest(INLINE_PUSH, {});

    // Then
    const logged = JSON.stringify(info.mock.calls);
    expect(logged).not.toContain(HASH);
    expect(logged).not.toContain(RAW_VALUE);
    expect(info.mock.calls[0]?.[1]).toMatchObject({
      query: REDACTED,
      variables: REDACTED,
    });
  });

  it('should log a generic message without stack for a malformed Threat Pulse payload', async () => {
    // Given
    vi.spyOn(logApp, 'info').mockImplementation(() => undefined);
    const error = vi.spyOn(logApp, 'error').mockImplementation(() => undefined);
    const query =
      'mutation Push($input: PushPulseInput!) { pushPulse(input: $input) { accepted } }';
    const listener = await startRequest(query, VARIABLES);

    // When
    await failRequest(listener, query, VARIABLES, coercionError());

    // Then
    const logged = JSON.stringify(error.mock.calls);
    expect(logged).not.toContain(HASH);
    expect(logged).not.toContain(RAW_VALUE);
    expect(error.mock.calls[0]?.[0]).toBe(REDACTED_PULSE_ERROR_MESSAGE);
    expect(error.mock.calls[0]?.[1]).toMatchObject({
      code: 'BAD_USER_INPUT',
      codeStack: undefined,
      variables: REDACTED,
    });
  });

  it('should never log the operation name or the aliased path of a Threat Pulse request', async () => {
    // Given a hash used as the operation name and as a field alias
    const info = vi.spyOn(logApp, 'info').mockImplementation(() => undefined);
    const error = vi.spyOn(logApp, 'error').mockImplementation(() => undefined);
    const operationName = `h${HASH}`;
    const query = `query ${operationName} { h${HASH}: pulseStatus { day } }`;
    const plugin: Plugin = errorLoggingPlugin();
    const listener = await plugin.requestDidStart?.({
      request: { query, operationName },
      contextValue: { req: { body: { variables: {} } } },
    } as unknown as GraphQLRequestContext<Context>);

    // When
    await listener?.didEncounterErrors?.({
      errors: [
        new GraphQLError('PULSE_RATE_LIMITED', {
          path: [`h${HASH}`],
          extensions: { code: 'PULSE_RATE_LIMITED' },
        }),
      ],
      operationName,
      request: { query, operationName },
      contextValue: { req: { body: { variables: {} } } },
    } as unknown as GraphQLRequestContextDidEncounterErrors<Context>);

    // Then
    const logged = JSON.stringify([info.mock.calls, error.mock.calls]);
    expect(logged).not.toContain(HASH);
    expect(info.mock.calls[0]?.[1]).toMatchObject({ operationName: REDACTED });
    expect(error.mock.calls[0]?.[1]).toMatchObject({
      operationName: REDACTED,
      path: undefined,
      code: 'PULSE_RATE_LIMITED',
    });
  });

  it('should keep the operation name and path of other operations', async () => {
    // Given
    vi.spyOn(logApp, 'info').mockImplementation(() => undefined);
    const error = vi.spyOn(logApp, 'error').mockImplementation(() => undefined);
    const query = 'query Me { me { id } }';
    const listener = await startRequest(query, {});

    // When
    await listener.didEncounterErrors?.({
      errors: [new GraphQLError('boom', { path: ['me'] })],
      operationName: 'Me',
      request: { query, operationName: 'Me' },
      contextValue: { req: { body: { variables: {} } } },
    } as unknown as GraphQLRequestContextDidEncounterErrors<Context>);

    // Then
    expect(error.mock.calls[0]?.[1]).toMatchObject({
      operationName: 'Me',
      path: ['me'],
    });
  });

  it('should keep the message and stack of other operations', async () => {
    // Given
    vi.spyOn(logApp, 'info').mockImplementation(() => undefined);
    const error = vi.spyOn(logApp, 'error').mockImplementation(() => undefined);
    const query = 'query { me { id } }';
    const listener = await startRequest(query, {});
    const failure = coercionError();

    // When
    await failRequest(listener, query, {}, failure);

    // Then
    expect(error.mock.calls[0]?.[0]).toBe(failure.message);
    expect(error.mock.calls[0]?.[1]).toMatchObject({
      codeStack: failure.originalError?.stack,
    });
  });
});
