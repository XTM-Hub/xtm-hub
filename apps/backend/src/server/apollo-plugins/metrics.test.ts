import { ApolloServer } from '@apollo/server';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createHandler } from 'graphql-sse';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  graphqlMutationCounter,
  graphqlOperationDuration,
  graphqlQueryCounter,
  operationMetricsPlugin,
  registry,
  sseActiveConnectionsGauge,
  sseMessageCounter,
  sseOperationMetrics,
  sseSubscriptionCounter,
} from './metrics';

const TEST_SCHEMA = makeExecutableSchema({
  typeDefs: `
    type Query {
      currentVotingRound(id: ID): String
      otherField: String
    }
    type Mutation {
      vote(id: ID): Boolean
    }
    type Subscription {
      votingRoundUpdated: String
    }
  `,
  resolvers: {
    Query: { currentVotingRound: () => 'round', otherField: () => 'other' },
    Mutation: { vote: () => true },
    Subscription: {
      votingRoundUpdated: {
        subscribe: async function* () {
          yield { votingRoundUpdated: 'round' };
        },
      },
    },
  },
});

const SSE_REQUEST_HEADERS: Record<string, string> = {
  accept: 'text/event-stream',
  'content-type': 'application/json',
};

const sseHandler = createHandler({
  schema: TEST_SCHEMA,
  context: () => ({}),
  onOperation: (ctx, _req, args) => {
    sseOperationMetrics.onOperation(ctx, args);
  },
  onNext: (ctx) => {
    sseOperationMetrics.onNext(ctx);
  },
  onComplete: (ctx) => {
    sseOperationMetrics.onComplete(ctx);
  },
});

const sendSseOperation = async (body: {
  query: string;
  operationName?: string;
}) => {
  const [stream] = await sseHandler({
    method: 'POST',
    url: '/graphql-sse',
    headers: { get: (name) => SSE_REQUEST_HEADERS[name] ?? null },
    body: JSON.stringify(body),
    raw: null,
    context: null,
  });
  const messages: string[] = [];
  if (stream && typeof stream !== 'string') {
    for await (const message of stream) {
      messages.push(message);
    }
  }
  return messages;
};

describe('operationMetricsPlugin', () => {
  let server: ApolloServer;

  beforeAll(async () => {
    server = new ApolloServer({
      schema: TEST_SCHEMA,
      plugins: [operationMetricsPlugin],
    });
    await server.start();
  });

  beforeEach(() => {
    graphqlQueryCounter.reset();
    graphqlMutationCounter.reset();
    graphqlOperationDuration.reset();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('should never use an operation name made up by the client as a label', async () => {
    // When
    await server.executeOperation({
      query: 'query MadeUpName123 { __typename }',
      operationName: 'MadeUpName123',
    });

    // Then
    const metrics = await registry.metrics();
    expect(metrics).not.toContain('MadeUpName123');
    expect(metrics).toContain('graphql_query_total{query="__typename"} 1');
  });

  it.each([
    {
      description: 'any operation name',
      query: 'query AnyName { currentVotingRound(id: "1") }',
      expectedLabel: 'currentVotingRound',
    },
    {
      description: 'an alias',
      query: 'query AnyName { renamed: currentVotingRound(id: "1") }',
      expectedLabel: 'currentVotingRound',
    },
    {
      description: 'several root fields',
      query: 'query AnyName { currentVotingRound(id: "1") otherField }',
      expectedLabel: 'multiple',
    },
    {
      description: 'a root field in a named fragment',
      query:
        'query AnyName { ...AnyNameFields } fragment AnyNameFields on Query { currentVotingRound(id: "1") }',
      expectedLabel: 'currentVotingRound',
    },
    {
      description: 'a root field in an inline fragment',
      query: 'query AnyName { ... on Query { currentVotingRound(id: "1") } }',
      expectedLabel: 'currentVotingRound',
    },
    {
      description: 'the same root field selected directly and in a fragment',
      query:
        'query AnyName { currentVotingRound(id: "1") ...AnyNameFields } fragment AnyNameFields on Query { currentVotingRound(id: "1") }',
      expectedLabel: 'currentVotingRound',
    },
    {
      description: 'several root fields in a fragment',
      query:
        'query AnyName { ...AnyNameFields } fragment AnyNameFields on Query { currentVotingRound(id: "1") otherField }',
      expectedLabel: 'multiple',
    },
  ])(
    'should count a query with $description under $expectedLabel',
    async ({ query, expectedLabel }) => {
      // When
      await server.executeOperation({ query });

      // Then
      const metrics = await registry.metrics();
      expect(metrics).toContain(
        `graphql_query_total{query="${expectedLabel}"} 1`
      );
      expect(metrics).not.toContain('AnyName');
    }
  );

  it('should count a query sent without an operation name', async () => {
    // When
    await server.executeOperation({ query: '{ currentVotingRound(id: "1") }' });

    // Then
    const metrics = await registry.metrics();
    expect(metrics).toContain(
      'graphql_query_total{query="currentVotingRound"} 1'
    );
    expect(metrics).toContain(
      'graphql_operation_duration_seconds_count{operation="query",name="currentVotingRound"} 1'
    );
  });

  it('should count a mutation under its root field', async () => {
    // When
    await server.executeOperation({
      query: 'mutation MadeUpVote { vote(id: "1") }',
    });

    // Then
    const metrics = await registry.metrics();
    expect(metrics).toContain('graphql_mutation_total{mutation="vote"} 1');
    expect(metrics).toContain(
      'graphql_operation_duration_seconds_count{operation="mutation",name="vote"} 1'
    );
    expect(metrics).not.toContain('MadeUpVote');
  });
});

describe('sseOperationMetrics', () => {
  beforeEach(() => {
    sseSubscriptionCounter.reset();
    sseMessageCounter.reset();
    sseActiveConnectionsGauge.reset();
  });

  it('should count a subscription under its root field, never under the operation name made up by the client', async () => {
    // When
    await sendSseOperation({
      query: 'subscription MadeUpName123 { votingRoundUpdated }',
      operationName: 'MadeUpName123',
    });

    // Then
    const metrics = await registry.metrics();
    expect(metrics).not.toContain('MadeUpName123');
    expect(metrics).toContain(
      'sse_subscription_total{subscription="votingRoundUpdated"} 1'
    );
    expect(metrics).toContain(
      'sse_message_total{subscription="votingRoundUpdated"} 1'
    );
    expect(metrics).toContain(
      'sse_active_connections{subscription="votingRoundUpdated"} 0'
    );
  });

  it('should not count an operation that fails validation', async () => {
    // When
    const messages = await sendSseOperation({
      query: 'subscription MadeUpName123 { madeUpField123 }',
      operationName: 'MadeUpName123',
    });

    // Then
    expect(messages.join('')).toContain('madeUpField123');
    const metrics = await registry.metrics();
    expect(metrics).not.toContain('MadeUpName123');
    expect(metrics).not.toContain('madeUpField123');
    expect(metrics).not.toMatch(/^sse_\w+\{/m);
  });
});
