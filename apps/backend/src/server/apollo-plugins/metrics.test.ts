import type {
  BaseContext,
  GraphQLRequestContext,
  GraphQLRequestContextDidResolveOperation,
  GraphQLRequestContextWillSendResponse,
} from '@apollo/server';
import { parse } from 'graphql';
import { beforeEach, describe, expect, it } from 'vitest';
import { REDACTED } from './log';
import {
  graphqlMutationCounter,
  graphqlOperationDuration,
  graphqlQueryCounter,
  operationMetricsPlugin,
} from './metrics';

const HASH = 'a1'.repeat(16);

// Resolves one operation through the plugin; a hash-only persisted query
// (`withQueryText: false`) carries no query text in the request.
const resolveOperation = async (
  document: string,
  operationName: string,
  { withQueryText = true }: { withQueryText?: boolean } = {}
): Promise<void> => {
  const queryText = withQueryText ? document : undefined;
  const listener = await operationMetricsPlugin.requestDidStart?.(
    {} as GraphQLRequestContext<BaseContext>
  );
  if (!listener) {
    throw new Error('The metrics plugin must return a request listener');
  }
  await listener.didResolveOperation?.({
    request: { query: queryText, operationName },
    document: parse(document),
    operationName,
  } as unknown as GraphQLRequestContextDidResolveOperation<BaseContext>);
  await listener.willSendResponse?.(
    {} as GraphQLRequestContextWillSendResponse<BaseContext>
  );
};

const metricLabels = async (): Promise<string[]> => {
  const metrics = await Promise.all([
    graphqlQueryCounter.get(),
    graphqlMutationCounter.get(),
    graphqlOperationDuration.get(),
  ]);
  return metrics.flatMap(({ values }) =>
    values.flatMap(({ labels }) => Object.values(labels).map(String))
  );
};

describe('operationMetricsPlugin labels', () => {
  beforeEach(() => {
    graphqlQueryCounter.reset();
    graphqlMutationCounter.reset();
    graphqlOperationDuration.reset();
  });

  it('should never use the operation name of a Threat Pulse request as a label', async () => {
    // Given a named query and a named mutation whose names carry a hash
    const query = `query Q_${HASH} { pulseStatus { day } }`;
    const mutation = `mutation M_${HASH}($input: PushPulseInput!) { pushPulse(input: $input) { accepted } }`;

    // When
    await resolveOperation(query, `Q_${HASH}`);
    await resolveOperation(mutation, `M_${HASH}`);

    // Then
    const labels = await metricLabels();
    expect(labels.some((label) => label.includes(HASH))).toBe(false);
    expect((await graphqlQueryCounter.get()).values).toEqual([
      expect.objectContaining({ labels: { query: REDACTED }, value: 1 }),
    ]);
    expect((await graphqlMutationCounter.get()).values).toEqual([
      expect.objectContaining({ labels: { mutation: REDACTED }, value: 1 }),
    ]);
  });

  it('should never use the operation name of a hash-only persisted query as a label', async () => {
    // Given a persisted query sent as a hash only: no query text to classify
    const document = `query P_${HASH} { pulseLookup(input: { day: "2026-10-03", object_type: indicator, hashes: [] }) { hash } }`;

    // When
    await resolveOperation(document, `P_${HASH}`, { withQueryText: false });

    // Then
    expect((await metricLabels()).some((label) => label.includes(HASH))).toBe(
      false
    );
    expect((await graphqlQueryCounter.get()).values).toEqual([
      expect.objectContaining({ labels: { query: REDACTED }, value: 1 }),
    ]);
  });

  it('should keep the operation name of other operations', async () => {
    // When
    await resolveOperation('query Me { me { id } }', 'Me');

    // Then
    expect((await graphqlQueryCounter.get()).values).toEqual([
      expect.objectContaining({ labels: { query: 'Me' }, value: 1 }),
    ]);
    expect(await metricLabels()).toContain('Me');
  });
});
